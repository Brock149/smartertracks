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
  id?: string;
  image_url: string;
  uploaded_at?: string;
  thumb_url?: string | null;
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
const getThumbnailUrl = (url: string) => resize(url, 96, 55);

export default function AllToolsScreen({ navigation }: AllToolsScreenProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Pagination
  const PAGE_SIZE = 40;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalToolsCount, setTotalToolsCount] = useState<number | null>(null);

  // Lazy checklist cache
  const [checklistsByTool, setChecklistsByTool] = useState<Record<string, ChecklistItem[]>>({});
  const [checklistsLoading, setChecklistsLoading] = useState<Set<string>>(new Set());
  const [checklistCounts, setChecklistCounts] = useState<Record<string, number>>({});

  // Map tool.id -> thumbnail URL for quick lookup during viewability changes
  const firstImageUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    tools.forEach(tool => {
      let resolvedThumb: string | null = null;
      if (tool.images && tool.images.length > 0) {
        const first = tool.images[0];
        resolvedThumb = first.thumb_url || getThumbnailUrl(first.image_url);
      } else if (tool.photo_url) {
        resolvedThumb = getThumbnailUrl(tool.photo_url);
      }
      if (resolvedThumb) {
        map[tool.id] = resolvedThumb;
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
      // Prefetch for rows index-1 .. index+1 (tighter window)
      for (let offset = -1; offset <= 1; offset++) {
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
    fetchTools(true);
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchTools(true);
    }, [])
  );

  useEffect(() => {
    filterTools();
  }, [searchQuery, tools]);

  const fetchTools = async (reset = false) => {
    try {
      // Get paginated tools for the user's company with owner information
      const currentOffset = reset ? 0 : offset;
      const { data: toolsData, error: toolsError, count } = await supabase
        .from('tools')
        .select(`
          *,
          owner:users!tools_current_owner_fkey(name)
        `, { count: 'exact' })
        .order('number')
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (toolsError) {
        console.error('Error fetching tools:', toolsError);
        Alert.alert('Error', 'Failed to load tools');
        return;
      }

      // Fetch images for this page of tools
      const toolIds = toolsData?.map(tool => tool.id) || [];
      
      const [imagesResponse, countsResponse] = await Promise.all([
        supabase
          .from('tool_images')
          .select('tool_id, thumb_url, is_primary, image_url')
          .in('tool_id', toolIds)
          .order('is_primary', { ascending: false })
          .order('uploaded_at', { ascending: true }),
        supabase
          .from('tool_checklists')
          .select('tool_id')
          .in('tool_id', toolIds)
      ]);

      if (imagesResponse.error) {
        console.error('Error fetching tool images:', imagesResponse.error);
      }

      const imagesData = (imagesResponse.data || []).filter((img: any) => img.is_primary === true);
      const countsData = countsResponse.data || [];

      // Group images and checklist items by tool_id
      const imagesByTool = imagesData.reduce((acc, image) => {
        if (!acc[image.tool_id]) {
          acc[image.tool_id] = [];
        }
        acc[image.tool_id].push(image);
        return acc;
      }, {} as Record<string, ToolImage[]>);

      // Fetch latest location and stored_at for each tool
      // Prefer RPC for latest transactions per tool; fallback to client reduction
      let transactionsData: any[] | null = null;
      let transactionsError: any = null;
      const { data: latestRows, error: rpcErr } = await supabase.rpc('latest_transactions_for_tools', { p_tool_ids: toolIds });
      if (!rpcErr && latestRows) {
        transactionsData = latestRows as any[];
      } else {
        const { data, error } = await supabase
          .from('tool_transactions')
          .select('tool_id, location, stored_at, timestamp')
          .in('tool_id', toolIds)
          .order('timestamp', { ascending: false })
          .limit(toolIds.length * 5);
        transactionsData = data || [];
        transactionsError = error;
      }

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
      })) || [];

      // Ensure numeric sort by tool number
      transformedTools.sort((a, b) => {
        const an = parseInt(String(a.number), 10);
        const bn = parseInt(String(b.number), 10);
        if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number));
        if (Number.isNaN(an)) return 1;
        if (Number.isNaN(bn)) return -1;
        return an - bn;
      });

      // Build counts map for this page
      const pageCounts = countsData.reduce((acc: Record<string, number>, row: any) => {
        acc[row.tool_id] = (acc[row.tool_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      if (reset) {
        setTools(transformedTools);
        setOffset(PAGE_SIZE);
        setHasMore((count ?? 0) > PAGE_SIZE);
        setChecklistCounts(pageCounts);
        setTotalToolsCount(count ?? transformedTools.length);
      } else {
        setTools(prev => [...prev, ...transformedTools]);
        setOffset(currentOffset + PAGE_SIZE);
        setHasMore((count ?? 0) > currentOffset + PAGE_SIZE);
        setChecklistCounts(prev => ({ ...prev, ...pageCounts }));
        if (count !== null && count !== undefined) setTotalToolsCount(count);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
      Alert.alert('Error', 'Failed to load tools');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
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

  const fetchChecklistForTool = async (toolId: string) => {
    if (checklistsByTool[toolId] || checklistsLoading.has(toolId)) return;
    const newLoading = new Set(checklistsLoading); newLoading.add(toolId); setChecklistsLoading(newLoading);
    const { data } = await supabase
      .from('tool_checklists')
      .select('id, item_name, required')
      .eq('tool_id', toolId)
      .order('item_name');
    setChecklistsByTool(prev => ({ ...prev, [toolId]: (data || []).map(i => ({ id: i.id, item_name: i.item_name, required: i.required })) }));
    newLoading.delete(toolId); setChecklistsLoading(newLoading);
  };

  const toggleChecklist = (toolId: string) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
        fetchChecklistForTool(toolId);
      }
      return newSet;
    });
  };

  const renderChecklistSection = (tool: Tool) => {
    const isExpanded = expandedChecklists.has(tool.id);
    const items = checklistsByTool[tool.id] || [];
    const count = checklistCounts[tool.id] ?? (items ? items.length : 0);

    return (
      <View style={styles.checklistContainer}>
        <TouchableOpacity 
          style={styles.checklistHeader}
          onPress={() => toggleChecklist(tool.id)}
        >
          <Text style={styles.checklistTitle}>Checklist{!isExpanded && typeof count === 'number' ? ` (${count})` : ''}</Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.checklistItems}>
            {(items || []).map((item) => (
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
            let thumbUrl: string | null = null;
            if (item.images && item.images.length > 0) {
              const first = item.images[0];
              thumbUrl = first.thumb_url || getThumbnailUrl(first.image_url);
            } else if (item.photo_url) {
              thumbUrl = getThumbnailUrl(item.photo_url);
            }
            if (thumbUrl) {
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
          {(totalToolsCount ?? filteredTools.length)} tool{(totalToolsCount ?? filteredTools.length) !== 1 ? 's' : ''} in company
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
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loadingMore && hasMore) {
            setLoadingMore(true);
            fetchTools(false);
          }
        }}
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