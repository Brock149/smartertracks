import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';

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

export default function AllToolsScreen({ navigation }: AllToolsScreenProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

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

      // Fetch images for all tools
      const toolIds = toolsData?.map(tool => tool.id) || [];
      const { data: imagesData, error: imagesError } = await supabase
        .from('tool_images')
        .select('*')
        .in('tool_id', toolIds)
        .order('uploaded_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching tool images:', imagesError);
      }

      // Group images by tool_id
      const imagesByTool = (imagesData || []).reduce((acc, image) => {
        if (!acc[image.tool_id]) {
          acc[image.tool_id] = [];
        }
        acc[image.tool_id].push(image);
        return acc;
      }, {} as Record<string, ToolImage[]>);

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

      // Transform the data to include owner name, images, location, and stored_at
      const transformedTools = toolsData?.map(tool => ({
        ...tool,
        owner_name: tool.owner?.name || null,
        images: imagesByTool[tool.id] || [],
        current_location: transactionsByTool[tool.id]?.location || 'Unknown',
        current_stored_at: transactionsByTool[tool.id]?.stored_at || 'Unknown',
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

    const filtered = tools.filter(tool =>
      tool.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.owner_name && tool.owner_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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

  const renderToolItem = ({ item }: { item: Tool }) => (
    <TouchableOpacity style={styles.toolCard} onPress={() => handleToolPress(item)}>
      <View style={styles.toolContent}>
        {/* Tool Image Preview */}
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0].image_url }}
              style={styles.toolImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera-outline" size={32} color="#d1d5db" />
            </View>
          )}
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
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
}); 