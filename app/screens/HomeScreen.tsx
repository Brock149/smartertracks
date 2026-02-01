import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';

interface HomeScreenProps {
  navigation: any;
}

interface RecentTransfer {
  id: string;
  timestamp: string;
  location: string | null;
  stored_at: string | null;
  hasIssues: boolean;
  tool: {
    id: string;
    number: string;
    name: string;
  } | null;
  from_user: {
    name: string;
  } | null;
  deleted_from_user_name: string | null;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const [myToolsCount, setMyToolsCount] = useState(0);
  const [myToolsWithIssuesCount, setMyToolsWithIssuesCount] = useState(0);
  const [companyToolsCount, setCompanyToolsCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingMoreRecent, setLoadingMoreRecent] = useState(false);
  const [recentOffset, setRecentOffset] = useState(0);
  const [recentHasMore, setRecentHasMore] = useState(true);

  const RECENT_DAYS = 14;
  const RECENT_LIMIT = 20;

  const fetchUserName = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching user name:', error);
        return;
      }
      setUserName(data?.name || '');
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  }, [user?.id]);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const myToolsResponse = await supabase
        .from('tools')
        .select('id', { count: 'exact' })
        .eq('current_owner', user.id);

      const myToolIds = (myToolsResponse.data || []).map((t) => t.id);
      const ownedCount = myToolsResponse.count ?? myToolIds.length;
      setMyToolsCount(ownedCount);

      const { count: companyCount } = await supabase
        .from('tools')
        .select('id', { count: 'exact', head: true });
      setCompanyToolsCount(companyCount ?? 0);

      let toolsWithIssues = 0;
      if (myToolIds.length > 0) {
        const { data: transactionsData } = await supabase
          .from('tool_transactions')
          .select('id, tool_id')
          .in('tool_id', myToolIds);

        const transactionIds = (transactionsData || []).map((t) => t.id);
        if (transactionIds.length > 0) {
          const transactionIdToToolId = new Map<string, string>(
            (transactionsData || []).map((t) => [t.id, t.tool_id])
          );

          const { data: reportsData } = await supabase
            .from('checklist_reports')
            .select('transaction_id')
            .in('transaction_id', transactionIds);

          const toolIdsWithIssues = new Set<string>();
          (reportsData || []).forEach((report) => {
            const toolId = transactionIdToToolId.get(report.transaction_id);
            if (toolId) toolIdsWithIssues.add(toolId);
          });
          toolsWithIssues = toolIdsWithIssues.size;
        }
      }

      setMyToolsWithIssuesCount(toolsWithIssues);
    } catch (error) {
      console.error('Error fetching home counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchRecentTransfers = useCallback(async (reset = false) => {
    if (!user?.id) return;
    if (reset) {
      setLoadingRecent(true);
    } else {
      setLoadingMoreRecent(true);
    }
    try {
      const since = new Date();
      since.setDate(since.getDate() - RECENT_DAYS);

      const offset = reset ? 0 : recentOffset;
      const { data, error } = await supabase
        .from('tool_transactions')
        .select(`
          id,
          timestamp,
          location,
          stored_at,
          deleted_from_user_name,
          tools(id, number, name),
          from_user:users!tool_transactions_from_user_id_fkey(name)
        `)
        .eq('to_user_id', user.id)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false })
        .range(offset, offset + RECENT_LIMIT - 1);

      if (error) {
        console.error('Error fetching recent transfers:', error);
        return;
      }

      const rows = data || [];
      const toolIds = rows
        .map((row: any) => (Array.isArray(row.tools) ? row.tools[0] : row.tools)?.id)
        .filter(Boolean) as string[];

      const toolIdsWithIssues = new Set<string>();
      if (toolIds.length > 0) {
        const { data: transactionsData } = await supabase
          .from('tool_transactions')
          .select('id, tool_id')
          .in('tool_id', toolIds);

        const transactionIds = (transactionsData || []).map((t) => t.id);
        if (transactionIds.length > 0) {
          const transactionIdToToolId = new Map<string, string>(
            (transactionsData || []).map((t) => [t.id, t.tool_id])
          );

          const { data: reportsData } = await supabase
            .from('checklist_reports')
            .select('transaction_id')
            .in('transaction_id', transactionIds);

          (reportsData || []).forEach((report) => {
            const toolId = transactionIdToToolId.get(report.transaction_id);
            if (toolId) toolIdsWithIssues.add(toolId);
          });
        }
      }

      const normalized = rows.map((row: any) => {
        const tool = Array.isArray(row.tools) ? row.tools[0] : row.tools;
        return {
        id: row.id,
        timestamp: row.timestamp,
        location: row.location ?? null,
        stored_at: row.stored_at ?? null,
          hasIssues: tool?.id ? toolIdsWithIssues.has(tool.id) : false,
          tool,
        from_user: Array.isArray(row.from_user) ? row.from_user[0] : row.from_user,
        deleted_from_user_name: row.deleted_from_user_name ?? null,
        };
      });

      setRecentTransfers((prev) => (reset ? normalized : [...prev, ...normalized]));
      setRecentHasMore(rows.length === RECENT_LIMIT);
      setRecentOffset(offset + rows.length);
    } catch (error) {
      console.error('Error fetching recent transfers:', error);
    } finally {
      setLoadingRecent(false);
      setLoadingMoreRecent(false);
    }
  }, [recentOffset, user?.id]);

  useEffect(() => {
    fetchCounts();
    fetchUserName();
    fetchRecentTransfers(true);
  }, [fetchCounts, fetchRecentTransfers, fetchUserName]);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
      fetchUserName();
      fetchRecentTransfers(true);
    }, [fetchCounts, fetchRecentTransfers, fetchUserName])
  );

  const handleAccountPress = () => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Account');
    } else {
      navigation.navigate('Account');
    }
  };

  const navigateToTab = (tabName: string) => {
    navigation.navigate('MainTabs', { screen: tabName });
  };

  const displayName = userName || 'Account';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.subtitle}>Your tool overview</Text>
        </View>
        <TouchableOpacity style={styles.accountButton} onPress={handleAccountPress}>
          <Ionicons name="person-circle-outline" size={30} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.8}
                onPress={() => navigateToTab('MyTools')}
              >
                <Text style={styles.statLabel}>My Tools</Text>
                <Text style={[styles.statValue, styles.statGreen]}>{myToolsCount}</Text>
                <Text style={styles.statFootnote}>Assigned to you</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.8}
                onPress={() => navigateToTab('MyTools')}
              >
                <Text style={styles.statLabel}>Tools With Issues</Text>
                <Text style={[styles.statValue, styles.statOrange]}>
                  {myToolsWithIssuesCount}
                </Text>
                <Text style={styles.statFootnote}>Need attention</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, styles.statCardFull]}
                activeOpacity={0.8}
                onPress={() => navigateToTab('AllTools')}
              >
                <Text style={styles.statLabel}>Company Tools</Text>
                <Text style={[styles.statValue, styles.statBlue]}>{companyToolsCount}</Text>
                <Text style={styles.statFootnote}>Total in company</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Receipts</Text>
                <Text style={styles.recentSubtitle}>Last {RECENT_DAYS} days</Text>
              </View>
              {loadingRecent ? (
                <View style={styles.recentLoading}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.loadingText}>Loading recent receipts...</Text>
                </View>
              ) : recentTransfers.length === 0 ? (
                <View style={styles.recentEmpty}>
                  <Text style={styles.recentEmptyText}>No tools received recently</Text>
                </View>
              ) : (
                <View style={styles.recentList}>
                  {recentTransfers.map((transfer) => {
                    const fromName =
                      transfer.from_user?.name || transfer.deleted_from_user_name || 'Unknown';
                    return (
                      <TouchableOpacity
                        key={transfer.id}
                        style={[
                          styles.recentItem,
                          transfer.hasIssues && styles.recentItemIssue,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => navigateToTab('MyTools')}
                      >
                        <View style={styles.recentItemRow}>
                          <View style={styles.recentToolRow}>
                            {transfer.hasIssues && (
                              <Ionicons name="warning" size={14} color="#dc2626" />
                            )}
                            <Text style={styles.recentTool}>
                              {transfer.tool?.number ? `#${transfer.tool.number} ` : ''}{transfer.tool?.name || 'Tool'}
                            </Text>
                          </View>
                          <Text style={styles.recentDate}>
                            {new Date(transfer.timestamp).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.recentMeta}>
                          From {fromName}
                          {transfer.location ? ` • Location: ${transfer.location}` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {recentHasMore && !loadingRecent && (
                <View style={styles.recentMoreContainer}>
                  <TouchableOpacity
                    style={styles.recentMoreButton}
                    onPress={() => fetchRecentTransfers(false)}
                    disabled={loadingMoreRecent}
                  >
                    {loadingMoreRecent ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Text style={styles.recentMoreText}>Show more</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerSpacer: {
    width: 34,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
  },
  accountButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4b5563',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 140,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardFull: {
    width: '100%',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  statGreen: {
    color: '#22c55e',
  },
  statOrange: {
    color: '#f97316',
  },
  statBlue: {
    color: '#60a5fa',
  },
  statFootnote: {
    marginTop: 8,
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  recentSection: {
    marginTop: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  recentSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  recentLoading: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  recentEmpty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  recentEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recentItemIssue: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  recentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  recentToolRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentTool: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  recentDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  recentMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  recentMoreContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  recentMoreButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  recentMoreText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
});
