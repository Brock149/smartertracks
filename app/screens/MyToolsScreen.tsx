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
import * as SecureStore from 'expo-secure-store';
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
  company_id: string;
  images?: ToolImage[];
  latest_location?: string;
  latest_stored_at?: string;
}

interface ToolImage {
  id: string;
  image_url: string;
  uploaded_at: string;
}

interface ChecklistReport {
  id: string;
  status: string;
  comments?: string;
  created_at: string;
  item_name: string;
}

interface ToolNotification {
  id: string;
  tool_id: string;
  tool_number: string;
  tool_name: string;
  from_user_name: string;
  timestamp: string;
  location: string;
  stored_at: string;
  notes?: string;
  hasIssues: boolean;
  issueCount: number;
  reports: ChecklistReport[];
}

interface MyToolsScreenProps {
  navigation: any;
}

export default function MyToolsScreen({ navigation }: MyToolsScreenProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<ToolNotification[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    fetchMyTools();
    fetchNotifications();
    loadDismissedNotifications();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMyTools();
      fetchNotifications();
    }, [])
  );

  useEffect(() => {
    filterTools();
  }, [searchQuery, tools]);

  const loadDismissedNotifications = async () => {
    try {
      const dismissed = await SecureStore.getItemAsync('dismissedNotifications');
      if (dismissed) {
        setDismissedNotifications(new Set(JSON.parse(dismissed)));
      }
    } catch (error) {
      console.error('Error loading dismissed notifications:', error);
    }
  };

  const saveDismissedNotifications = async (dismissedSet: Set<string>) => {
    try {
      await SecureStore.setItemAsync('dismissedNotifications', JSON.stringify([...dismissedSet]));
    } catch (error) {
      console.error('Error saving dismissed notifications:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(notificationId);
    setDismissedNotifications(newDismissed);
    await saveDismissedNotifications(newDismissed);
  };

  const fetchMyTools = async () => {
    try {
      // Get only tools owned by the current user
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          *,
          owner:users!tools_current_owner_fkey(name)
        `)
        .eq('current_owner', user?.id)
        .order('number');

      if (toolsError) {
        console.error('Error fetching my tools:', toolsError);
        Alert.alert('Error', 'Failed to load your tools');
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

      // Fetch latest transactions for all tools
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, stored_at, timestamp')
        .in('tool_id', toolIds)
        .order('timestamp', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching tool transactions:', transactionsError);
      }

      // Group images by tool_id
      const imagesByTool = (imagesData || []).reduce((acc, image) => {
        if (!acc[image.tool_id]) {
          acc[image.tool_id] = [];
        }
        acc[image.tool_id].push(image);
        return acc;
      }, {} as Record<string, ToolImage[]>);

      // Group latest transactions by tool_id
      const latestTransactionsByTool = (transactionsData || []).reduce((acc, transaction) => {
        if (!acc[transaction.tool_id]) {
          acc[transaction.tool_id] = transaction;
        }
        return acc;
      }, {} as Record<string, any>);

      // Transform the data to include images, latest transaction data, and owner name
      const transformedTools = toolsData?.map(tool => ({
        ...tool,
        images: imagesByTool[tool.id] || [],
        latest_location: latestTransactionsByTool[tool.id]?.location || 'Unknown',
        latest_stored_at: latestTransactionsByTool[tool.id]?.stored_at || 'Unknown',
        owner_name: tool.owner?.name || null,
      })) || [];

      setTools(transformedTools);
    } catch (error) {
      console.error('Error fetching my tools:', error);
      Alert.alert('Error', 'Failed to load your tools');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      // Get recent tool transfers where user is the recipient (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: transfers, error } = await supabase
        .from('tool_transactions')
        .select(`
          id,
          tool_id,
          timestamp,
          location,
          stored_at,
          notes,
          from_user_id,
          deleted_from_user_name,
          tools(id, number, name),
          from_user:users!from_user_id(name)
        `)
        .eq('to_user_id', user.id)
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (!transfers || transfers.length === 0) {
        setNotifications([]);
        return;
      }

      // For each transfer, check if the tool has open checklist issues
      const notificationsWithIssues = await Promise.all(
        transfers.map(async (transfer) => {
          let hasIssues = false;
          let issueCount = 0;
          let reports: ChecklistReport[] = [];

          // Look for ALL checklist reports for this tool (all existing reports are unresolved)
          if (transfer.tool_id) {
            // First get all transactions for this tool
            const { data: toolTransactions } = await supabase
              .from('tool_transactions')
              .select('id')
              .eq('tool_id', transfer.tool_id);

            if (toolTransactions && toolTransactions.length > 0) {
              const transactionIds = toolTransactions.map(t => t.id);
              
              // Get all checklist reports for these transactions
              const { data: reportsData, error: reportsError } = await supabase
                .from('checklist_reports')
                .select(`
                  id, 
                  status, 
                  comments, 
                  created_at,
                  checklist_item:tool_checklists(item_name)
                `)
                .in('transaction_id', transactionIds)
                .order('created_at', { ascending: false });

                        // Debug logging
              console.log(`Transfer ID: ${transfer.id} - Found ${reportsData?.length || 0} reports`);

              if (reportsData && reportsData.length > 0) {
                hasIssues = true;
                issueCount = reportsData.length;
                reports = reportsData.map(report => {
                  const checklistItem = Array.isArray(report.checklist_item) ? report.checklist_item[0] : report.checklist_item;
                  return {
                    id: report.id,
                    status: report.status,
                    comments: report.comments,
                    created_at: report.created_at,
                    item_name: checklistItem?.item_name || 'Unknown Item'
                  };
                });
              }
            }
          }

          const tool = Array.isArray(transfer.tools) ? transfer.tools[0] : transfer.tools;
          const fromUser = Array.isArray(transfer.from_user) ? transfer.from_user[0] : transfer.from_user;

          const notification = {
            id: transfer.id,
            tool_id: transfer.tool_id || '',
            tool_number: tool?.number || 'Unknown',
            tool_name: tool?.name || 'Unknown Tool',
            from_user_name: fromUser?.name || transfer.deleted_from_user_name || 'Unknown User',
            timestamp: transfer.timestamp,
            location: transfer.location,
            stored_at: transfer.stored_at,
            notes: transfer.notes,
            hasIssues,
            issueCount,
            reports,
          };

          // Debug logging
          console.log(`Created notification for tool ${notification.tool_number}: hasIssues=${notification.hasIssues}, count=${notification.issueCount}`);

          return notification;
        })
      );

      setNotifications(notificationsWithIssues);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const filterTools = () => {
    if (!searchQuery.trim()) {
      setFilteredTools(tools);
      return;
    }

    const filtered = tools.filter(tool =>
      tool.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredTools(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTools();
    fetchNotifications();
  };

  const handleToolPress = (tool: Tool) => {
    navigation.navigate('ToolDetail', { tool });
  };

  const renderToolItem = ({ item }: { item: Tool }) => {
    // Check if this tool has a notification and hasn't been dismissed
    const notification = notifications.find(n => n.tool_id === item.id && !dismissedNotifications.has(n.id));
    const isExpanded = expandedNotifications.has(item.id);

    return (
      <View style={[
        styles.toolContainer,
        notification && styles.toolWithNotification
      ]}>
        {/* Notification Banner - if this tool was recently received */}
        {notification && (
          <View style={[
            styles.toolNotificationBanner,
            notification.hasIssues && styles.toolNotificationBannerWithIssues
          ]}>
            <View style={styles.notificationHeader}>
              <Ionicons 
                name={notification.hasIssues ? "warning" : "gift"} 
                size={16} 
                color={notification.hasIssues ? "#f59e0b" : "#059669"} 
              />
              <Text style={styles.notificationHeaderText}>
                New tool from {notification.from_user_name}
                {notification.hasIssues && (
                  <Text style={styles.notificationIssues}>
                    {' • '}{notification.issueCount} issue{notification.issueCount !== 1 ? 's' : ''} reported
                  </Text>
                )}
              </Text>
            </View>

            {/* Only show expanded section for notifications with issues */}
            {isExpanded && notification.hasIssues && notification.reports.length > 0 && (
              <View style={styles.notificationExpanded}>
                <Text style={styles.notificationIssueHeader}>
                  🔍 Reported Issues:
                </Text>
                {notification.reports.map((report, index) => (
                  <View key={report.id} style={styles.reportItem}>
                                            <View style={styles.reportHeader}>
                          <Text style={styles.reportStatus}>
                            {report.status === 'Damaged/Needs Repair' ? '🔧' : '📦'} {report.item_name} - {report.status}
                          </Text>
                          <Text style={styles.reportDate}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                                            {report.comments && (
                          <Text style={styles.reportDetails}>"{report.comments}"</Text>
                        )}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.notificationActions}>
              {/* Only show expand/collapse for notifications with issues */}
              {notification.hasIssues && notification.reports.length > 0 && (
                <TouchableOpacity 
                  style={styles.notificationActionButton}
                  onPress={() => {
                    setExpandedNotifications(prev => {
                      const newSet = new Set(prev);
                      if (isExpanded) {
                        newSet.delete(item.id);
                      } else {
                        newSet.add(item.id);
                      }
                      return newSet;
                    });
                  }}
                >
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.notificationActionButton, styles.acceptButton]}
                onPress={async () => {
                  // Accept notification - dismiss it permanently
                  await dismissNotification(notification.id);
                  setExpandedNotifications(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(item.id);
                    return newSet;
                  });
                }}
              >
                <Ionicons name="checkmark" size={16} color="#059669" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.notificationActionButton}
                onPress={async () => {
                  // Dismiss notification - remove it permanently
                  await dismissNotification(notification.id);
                  setExpandedNotifications(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(item.id);
                    return newSet;
                  });
                }}
              >
                <Ionicons name="close" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tool Card */}
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
                <View style={styles.ownedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.ownedText}>Owned</Text>
                </View>
              </View>
              
              {item.description && (
                <Text style={styles.toolDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              
              <View style={styles.toolDetails}>
                <View style={styles.locationInfo}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailText}>
                      {item.latest_location}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stored At:</Text>
                    <Text style={styles.detailText}>
                      {item.latest_stored_at}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.transferButton}
                  onPress={() => {
                    console.log('Navigating to Transfer with tool:', item);
                    navigation.getParent()?.navigate('Transfer', { selectedTool: item });
                  }}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color="#2563eb" />
                  <Text style={styles.transferButtonText}>Transfer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tools</Text>
        <Text style={styles.subtitle}>
          {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} assigned to you
        </Text>
      </View>



      {tools.length > 0 && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your tools..."
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
      )}

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
            <Ionicons name="person-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No tools assigned</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'No tools match your search'
                : 'You don\'t have any tools assigned to you yet'
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
    flexGrow: 1,
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
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4,
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
  locationInfo: {
    flex: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  transferButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 4,
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
    paddingHorizontal: 32,
  },
  // Tool-specific notification styles
  toolContainer: {
    marginBottom: 12,
  },
  toolWithNotification: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#f9fafb',
    marginHorizontal: 8,
  },
  toolNotificationBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 8,
    padding: 12,
  },
  toolNotificationBannerWithIssues: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationHeaderText: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  notificationIssues: {
    color: '#dc2626',
    fontWeight: '600',
  },
  notificationExpanded: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notificationDetail: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  notificationIssueDetail: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 8,
    fontWeight: '500',
  },
  notificationIssueHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  reportItem: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  reportDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  reportDetails: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  notificationActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  acceptButton: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
  },
  acceptButtonText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4,
  },
}); 