import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase/client';

interface ToolGroup {
  id: string;
  name: string;
  description: string | null;
}

interface GroupToolInfo {
  number: string;
  name: string;
}

type GroupsScreenProps = {
  navigation: any;
};

export default function GroupsScreen({ navigation }: GroupsScreenProps) {
  const [groups, setGroups] = useState<ToolGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [groupToolsMap, setGroupToolsMap] = useState<Record<string, GroupToolInfo[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'alpha' | 'most'>('most');

  useEffect(() => {
    fetchGroups();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups();
    }, [])
  );

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tool_groups')
        .select('id, name, description')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      const list = data || [];
      setGroups(list);

      const { data: memberRows, error: memberError } = await supabase
        .from('tool_group_members')
        .select('group_id, tools ( number, name )');

      if (memberError) throw memberError;

      const counts: Record<string, number> = {};
      const toolsMap: Record<string, GroupToolInfo[]> = {};
      (memberRows || []).forEach((row: any) => {
        counts[row.group_id] = (counts[row.group_id] || 0) + 1;
        const tool = Array.isArray(row.tools) ? row.tools[0] : row.tools;
        if (tool) {
          if (!toolsMap[row.group_id]) toolsMap[row.group_id] = [];
          toolsMap[row.group_id].push({ number: tool.number, name: tool.name });
        }
      });
      setGroupCounts(counts);
      setGroupToolsMap(toolsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const matchingToolsByGroup = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return {} as Record<string, GroupToolInfo[]>;
    const result: Record<string, GroupToolInfo[]> = {};
    groups.forEach((g) => {
      const tools = groupToolsMap[g.id] || [];
      const matches = tools.filter(
        (t) => t.number.toLowerCase().includes(term) || t.name.toLowerCase().includes(term)
      );
      if (matches.length > 0) result[g.id] = matches;
    });
    return result;
  }, [searchTerm, groups, groupToolsMap]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => {
      if (group.name.toLowerCase().includes(term)) return true;
      if (matchingToolsByGroup[group.id]) return true;
      return false;
    });
  }, [groups, searchTerm, matchingToolsByGroup]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (sortMode === 'alpha') {
        return a.name.localeCompare(b.name);
      }
      const aCount = groupCounts[a.id] ?? 0;
      const bCount = groupCounts[b.id] ?? 0;
      if (aCount === bCount) return a.name.localeCompare(b.name);
      return bCount - aCount;
    });
  }, [filteredGroups, sortMode, groupCounts]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchGroups}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.controls}>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort</Text>
              <View style={styles.sortButtons}>
                <TouchableOpacity
                  onPress={() => setSortMode('most')}
                  style={[styles.sortButton, sortMode === 'most' && styles.sortButtonActive]}
                >
                  <Text style={[styles.sortButtonText, sortMode === 'most' && styles.sortButtonTextActive]}>
                    Most tools
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortMode('alpha')}
                  style={[styles.sortButton, sortMode === 'alpha' && styles.sortButtonActive]}
                >
                  <Text style={[styles.sortButtonText, sortMode === 'alpha' && styles.sortButtonTextActive]}>
                    A-Z
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.searchBox}>
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search groups or tools..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View style={styles.groupList}>
            {sortedGroups.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchTerm.trim() ? 'No groups or tools match your search.' : 'No groups yet.'}
              </Text>
            ) : (
              sortedGroups.map((group) => {
                const toolMatches = matchingToolsByGroup[group.id];
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.groupCard}
                    onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                  >
                    <View style={styles.groupRow}>
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        {group.description ? (
                          <Text style={styles.groupDescription}>{group.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.groupCountPill}>
                        <Text style={styles.groupCountText}>{groupCounts[group.id] ?? 0}</Text>
                        <Text style={styles.groupCountLabel}>tools</Text>
                      </View>
                    </View>
                    {toolMatches && toolMatches.length > 0 && (
                      <View style={styles.matchedToolsList}>
                        {toolMatches.map((t, idx) => (
                          <View key={`${t.number}-${idx}`} style={styles.matchedToolRow}>
                            <Ionicons name="construct-outline" size={13} color="#6b7280" />
                            <Text style={styles.matchedToolText}>
                              #{t.number} - {t.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  refreshText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  controls: {
    gap: 10,
  },
  searchBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    fontSize: 14,
    color: '#111827',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sortButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  sortButtonTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  errorCard: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  groupList: {
    gap: 10,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  groupDescription: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  groupCountPill: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  groupCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  groupCountLabel: {
    fontSize: 11,
    color: '#2563eb',
  },
  matchedToolsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
  },
  matchedToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  matchedToolText: {
    fontSize: 13,
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
