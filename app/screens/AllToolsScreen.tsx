import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import { resize } from '../utils';

interface Tool {
  id: string;
  number: string;
  name: string;
  description: string;
  current_owner: string | null;
  photo_url: string | null;
  created_at: string;
  owner_name?: string;
  company_id: string;
  images?: ToolImage[];
  current_location?: string;
  current_stored_at?: string;
  checklist_items?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  item_name: string;
  required: boolean;
}

interface ToolImage {
  id: string;
  image_url: string;
  uploaded_at: string;
}

interface ToolTransaction {
  id: string;
  location: string;
  timestamp: string;
  to_user_id: string | null;
  deleted_to_user_name: string | null;
}

interface AllToolsScreenProps {
  navigation: any;
}

// Helper to convert Supabase storage image URL to a low-res thumbnail using Supabase CDN transforms
const getThumbnailUrl = (url: string) => resize(url, 200, 80);

export default function AllToolsScreen({ navigation }: AllToolsScreenProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Map tool.id -> thumbnail URL for quick lookup during viewability changes
  const firstImageUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    tools.forEach(tool => {
      let imgUrl: string | null = null;
      if (tool.images && tool.images.length > 0) {
        imgUrl = tool.images[0].image_url;
      } else if (tool.photo_url) {
        imgUrl = tool.photo_url;
      }
      if (imgUrl) {
        map[tool.id] = getThumbnailUrl(imgUrl);
      }
    });
    return map;
  }, [tools]);

  // Prefetch thumbnails only for rows currently on screen (+/- few) using FlatList viewability API
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const prefetched = useRef<Set<string>>(new Set()).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null | undefined; item: Tool }> }) => {
    viewableItems.forEach(({ index }) => {
      if (index === null || index === undefined) return;
      // Prefetch for rows index-3 .. index+3
      for (let offset = -3; offset <= 3; offset++) {
        const targetIdx = index + offset;
        if (targetIdx < 0 || targetIdx >= tools.length) continue;
        const toolId = tools[targetIdx].id;
        if (prefetched.has(toolId)) continue;
        const url = firstImageUrlMap[toolId];
        if (url) {
          prefetched.add(toolId);
          RNImage.prefetch(url);
        }
      }
    });
  }).current;

  useEffect(() => {
    fetchTools();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchTools();
    }, [])
  );

  useEffect(() => {
    filterTools();
  }, [searchQuery, tools]);

  const fetchTools = async () => {
    try {
      // Get all tools for the user's company with owner information
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          *,
          owner:users!tools_current_owner_fkey(name)
        `)
        .order('number');

      if (toolsError) {
        console.error('Error fetching tools:', toolsError);
        Alert.alert('Error', 'Failed to load tools');
        return;
      }

      // Fetch images and checklist items for all tools
      const toolIds = toolsData?.map(tool => tool.id) || [];
      
      const [imagesResponse, checklistResponse] = await Promise.all([
        supabase
          .from('tool_images')
          .select('*')
          .in('tool_id', toolIds)
          .order('is_primary', { ascending: false })
          .order('uploaded_at', { ascending: true }),
        supabase
          .from('tool_checklists')
          .select('*')
          .in('tool_id', toolIds)
          .order('item_name')
      ]);

      if (imagesResponse.error) {
        console.error('Error fetching tool images:', imagesResponse.error);
      }

      if (checklistResponse.error) {
        console.error('Error fetching tool checklists:', checklistResponse.error);
      }

      const imagesData = imagesResponse.data || [];
      const checklistData = checklistResponse.data || [];

      // Group images and checklist items by tool_id
      const imagesByTool = imagesData.reduce((acc, image) => {
        if (!acc[image.tool_id]) {
          acc[image.tool_id] = [];
        }
        acc[image.tool_id].push(image);
        return acc;
      }, {} as Record<string, ToolImage[]>);

      const checklistsByTool = checklistData.reduce((acc, item) => {
        if (!acc[item.tool_id]) {
          acc[item.tool_id] = [];
        }
        acc[item.tool_id].push({
          id: item.id,
          item_name: item.item_name,
          required: item.required,
        });
        return acc;
      }, {} as Record<string, ChecklistItem[]>);

      // Fetch latest location and stored_at for each tool
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, stored_at, timestamp')
        .in('tool_id', toolIds)
        .order('timestamp', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching tool transactions:', transactionsError);
      }

      // Get the latest location and stored_at for each tool
      const transactionsByTool = (transactionsData || []).reduce((acc, transaction) => {
        if (!acc[transaction.tool_id]) {
          acc[transaction.tool_id] = {
            location: transaction.location,
            stored_at: transaction.stored_at
          };
        }
        return acc;
      }, {} as Record<string, { location: string; stored_at: string }>);

      // Transform the data to include owner name, images, location, stored_at, and checklist items
      const transformedTools = toolsData?.map(tool => ({
        ...tool,
        owner_name: tool.owner?.name || null,
        images: imagesByTool[tool.id] || [],
        current_location: transactionsByTool[tool.id]?.location || 'Unknown',
        current_stored_at: transactionsByTool[tool.id]?.stored_at || 'Unknown',
        checklist_items: checklistsByTool[tool.id] || [],
      })) || [];

      setTools(transformedTools);
    } catch (error) {
      console.error('Error fetching tools:', error);
      Alert.alert('Error', 'Failed to load tools');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTools = () => {
    if (!searchQuery.trim()) {
      setFilteredTools(tools);
      return;
    }

    const lowerSearch = searchQuery.toLowerCase();

    const filtered = tools.filter(tool => {
      const matchesNumber = tool.number.toLowerCase().includes(lowerSearch);
      const matchesName = tool.name.toLowerCase().includes(lowerSearch);
      const matchesDescription = (tool.description || '').toLowerCase().includes(lowerSearch);
      const matchesOwner = (tool.owner_name || '').toLowerCase().includes(lowerSearch);
      const matchesLocation = (tool.current_location || '').toLowerCase().includes(lowerSearch);

      return (
        matchesNumber ||
        matchesName ||
        matchesDescription ||
        matchesOwner ||
        matchesLocation
      );
    });

    setFilteredTools(filtered);
  };

  const getToolLocation = async (toolId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('tool_transactions')
        .select('location, timestamp, to_user_id, deleted_to_user_name')
        .eq('tool_id', toolId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return 'Unknown';
      }

      const latestTransaction = data[0];
      return latestTransaction.location || 'Unknown';
    } catch (error) {
      console.error('Error fetching tool location:', error);
      return 'Unknown';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTools();
  };

  const handleToolPress = (tool: Tool) => {
    navigation.navigate('ToolDetail', { tool });
  };

  const toggleChecklist = (toolId: string) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const renderChecklistSection = (tool: Tool) => {
    if (!tool.checklist_items || tool.checklist_items.length === 0) {
      return null;
    }

    const isExpanded = expandedChecklists.has(tool.id);

    return (
      <View style={styles.checklistContainer}>
        <TouchableOpacity 
          style={styles.checklistHeader}
          onPress={() => toggleChecklist(tool.id)}
        >
          <Text style={styles.checklistTitle}>
            Checklist ({tool.checklist_items.length} items)
          </Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.checklistItems}>
            {tool.checklist_items.map((item) => (
              <View key={item.id} style={styles.checklistItem}>
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemName}>{item.item_name}</Text>
                  {item.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>Required</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderToolItem = ({ item }: { item: Tool }) => (
    <TouchableOpacity style={styles.toolCard} onPress={() => handleToolPress(item)}>
      <View style={styles.toolContent}>
        {/* Tool Image Preview */}
        <View style={styles.imageContainer}>
          {(() => {
            let imgUrl: string | null = null;
            if (item.images && item.images.length > 0) {
              imgUrl = item.images[0].image_url;
            } else if (item.photo_url) {
              imgUrl = item.photo_url;
            }
            if (imgUrl) {
              const thumbUrl = getThumbnailUrl(imgUrl);
              return (
                <ExpoImage
                  source={{ uri: thumbUrl }}
                  style={styles.toolImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              );
            }
            return (
              <View style={styles.placeholderImage}>
                <Ionicons name="camera-outline" size={32} color="#d1d5db" />
              </View>
            );
          })()}
          {item.images && item.images.length > 1 && (
            <View style={styles.imageCount}>
              <Text style={styles.imageCountText}>+{item.images.length - 1}</Text>
            </View>
          )}
        </View>

        {/* Tool Info */}
        <View style={styles.toolInfo}>
          <View style={styles.toolHeader}>
            <View style={styles.toolTitleContainer}>
          <Text style={styles.toolNumber}>#{item.number}</Text>
          <Text style={styles.toolName}>{item.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
      
      {item.description && (
        <Text style={styles.toolDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.toolDetails}>
        <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Owner:</Text>
          <Text style={styles.detailText}>
            {item.owner_name || 'Unassigned'}
          </Text>
        </View>
        <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailText}>
                {item.current_location || 'Unknown'}
          </Text>
            </View>
        <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stored At:</Text>
          <Text style={styles.detailText}>
                {item.current_stored_at || 'Unknown'}
          </Text>
            </View>
          </View>
          
          {/* Checklist Section */}
          {renderChecklistSection(item)}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>All Tools</Text>
        <Text style={styles.subtitle}>
          {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} in company
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tools by number, name, or owner..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredTools}
        renderItem={renderToolItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews={true}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No tools found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'No tools have been added yet'
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  toolCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toolContent: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  toolImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageCount: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  toolInfo: {
    flex: 1,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  toolTitleContainer: {
    flex: 1,
  },
  toolNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  toolName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  toolDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  toolDetails: {
    marginTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  checklistContainer: {
    marginTop: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  checklistItems: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  checklistItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  checklistItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistItemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
}); 