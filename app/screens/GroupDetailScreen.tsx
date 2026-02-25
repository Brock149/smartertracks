import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase/client';
import { resize } from '../utils';

interface ToolGroup {
  id: string;
  name: string;
  description: string | null;
}

interface ToolSummary {
  id: string;
  number: string;
  name: string;
  owner_name?: string | null;
  location?: string | null;
  thumbnail_url?: string | null;
}

type GroupDetailScreenProps = {
  navigation: any;
  route: { params: { groupId: string } };
};

export default function GroupDetailScreen({ navigation, route }: GroupDetailScreenProps) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<ToolGroup | null>(null);
  const [groupTools, setGroupTools] = useState<ToolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getThumbnailUrl = (url: string) => resize(url, 48, 45);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchGroup();
    }, [groupId])
  );

  const fetchGroup = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: groupData, error: groupError } = await supabase
        .from('tool_groups')
        .select('id, name, description')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      const { data: members, error: memberError } = await supabase
        .from('tool_group_members')
        .select('tool_id, tools ( id, number, name, current_owner, users!tools_current_owner_fkey(name) )')
        .eq('group_id', groupId);

      if (memberError) throw memberError;
      const toolIds = (members || []).map((row: any) => row.tool_id);

      const ownerMap = new Map<string, string | null>();
      (members || []).forEach((row: any) => {
        const tool = Array.isArray(row.tools) ? row.tools[0] : row.tools;
        if (tool?.id) {
          const ownerName =
            tool.users && typeof tool.users === 'object' && 'name' in tool.users
              ? String(tool.users.name)
              : null;
          ownerMap.set(tool.id, ownerName);
        }
      });

      let latestLocation = new Map<string, string | null>();
      if (toolIds.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('tool_transactions')
          .select('tool_id, location, timestamp')
          .in('tool_id', toolIds)
          .order('timestamp', { ascending: false });

        if (txError) throw txError;
        (txData || []).forEach((tx: any) => {
          if (!latestLocation.has(tx.tool_id)) {
            latestLocation.set(tx.tool_id, tx.location ?? null);
          }
        });
      }

      const thumbnailByTool = new Map<string, string>();
      if (toolIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('tool_images')
          .select('tool_id, image_url, thumb_url, is_primary, uploaded_at')
          .in('tool_id', toolIds)
          .order('is_primary', { ascending: false })
          .order('uploaded_at', { ascending: true });

        if (imagesError) throw imagesError;
        (imagesData || []).forEach((row: any) => {
          if (thumbnailByTool.has(row.tool_id)) return;
          const resolved = row.thumb_url || getThumbnailUrl(row.image_url);
          if (resolved) {
            thumbnailByTool.set(row.tool_id, resolved);
          }
        });
      }

      const tools: ToolSummary[] = (members || [])
        .map((row: any) => {
          const tool = Array.isArray(row.tools) ? row.tools[0] : row.tools;
          if (!tool) return null;
          return {
            id: tool.id,
            number: tool.number,
            name: tool.name,
            owner_name: ownerMap.get(tool.id) ?? null,
            location: latestLocation.get(tool.id) ?? null,
            thumbnail_url: thumbnailByTool.get(tool.id) ?? null,
          } as ToolSummary;
        })
        .filter(Boolean) as ToolSummary[];

      tools.sort((a, b) => {
        const an = parseInt(String(a.number), 10);
        const bn = parseInt(String(b.number), 10);
        if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number));
        if (Number.isNaN(an)) return 1;
        if (Number.isNaN(bn)) return -1;
        return an - bn;
      });

      setGroupTools(tools);
    } catch (err: any) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferGroup = () => {
    navigation.navigate('TransferMultiple', { groupId });
  };

  const groupCountText = useMemo(() => `Tools in Group (${groupTools.length})`, [groupTools.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Group Details</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderInfo}>
                <Text style={styles.detailTitle}>{group?.name || 'Group'}</Text>
                {group?.description ? (
                  <Text style={styles.detailSubtitle}>{group.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.transferButton} onPress={handleTransferGroup}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#ffffff" />
                <Text style={styles.transferButtonText}>Claim Group</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.detailSectionTitle}>{groupCountText}</Text>

            {groupTools.length === 0 ? (
              <Text style={styles.emptyText}>No tools in this group.</Text>
            ) : (
              <View style={styles.toolsList}>
                {groupTools.map((tool) => (
                  <TouchableOpacity
                    key={tool.id}
                    style={styles.toolRow}
                    onPress={() => navigation.navigate('ToolDetail', { tool })}
                  >
                    {tool.thumbnail_url ? (
                      <ExpoImage
                        source={{ uri: tool.thumbnail_url }}
                        style={styles.toolThumb}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={styles.toolThumbPlaceholder}>
                        <Ionicons name="image-outline" size={18} color="#9ca3af" />
                      </View>
                    )}
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>
                        #{tool.number} - {tool.name}
                      </Text>
                      <Text style={styles.toolMeta}>Owner: {tool.owner_name || 'Unassigned'}</Text>
                      <Text style={styles.toolMeta}>Location: {tool.location || 'Unknown'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: 16,
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
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailHeaderInfo: {
    flex: 1,
    minWidth: 180,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailSubtitle: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  transferButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  toolsList: {
    gap: 10,
  },
  toolRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  toolThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    gap: 4,
    flex: 1,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  toolMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
