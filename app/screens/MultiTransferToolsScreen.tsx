import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/client';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';

interface Tool {
  id: string;
  number: string;
  name: string;
  description: string;
  current_owner: string | null;
  company_id: string;
  owner_name?: string;
  latest_location?: string;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  required: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ToolGroup {
  id: string;
  name: string;
  description: string | null;
}

interface IssueItem {
  tool: Tool;
  status: string;
  comments?: string | null;
  checklist_item_name?: string | null;
  created_at?: string | null;
}

export default function MultiTransferToolsScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tool[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [checklistsByTool, setChecklistsByTool] = useState<Record<string, ChecklistItem[]>>({});
  const [checklistStatusByTool, setChecklistStatusByTool] = useState<Record<string, Record<string, 'damaged' | 'replace' | null>>>({});
  const [checklistCommentsByTool, setChecklistCommentsByTool] = useState<Record<string, Record<string, string>>>({});
  const [checklistsLoading, setChecklistsLoading] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<ToolGroup[]>([]);
  const [toUser, setToUser] = useState('');
  const [location, setLocation] = useState('');
  const [storedAt, setStoredAt] = useState('');
  const [storedAtPickerVisible, setStoredAtPickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [openIssues, setOpenIssues] = useState<IssueItem[]>([]);

  const storedAtOptions = ['On Truck', 'On Job Site', 'N/A'];

  const isClaimingAny = useMemo(
    () => selectedTools.some((tool) => tool.current_owner !== user?.id),
    [selectedTools, user?.id]
  );

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  useEffect(() => {
    if (route?.params?.groupId) {
      addGroupTools(route.params.groupId);
    }
    if (route?.params?.toolIds) {
      fetchToolsByIds(route.params.toolIds);
    }
  }, [route?.params?.groupId, route?.params?.toolIds]);

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      searchTools();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isClaimingAny && user?.id) {
      const me = users.find((u) => u.id === user.id);
      setToUser(me?.name || 'Me');
    }
  }, [isClaimingAny, user?.id, users]);

  const isTransferFormValid = (
    selectedTools.length > 0 &&
    location.trim().length > 0 &&
    storedAt.trim().length > 0 &&
    (isClaimingAny || toUser.trim().length > 0)
  );

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .order('name');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_groups')
        .select('id, name, description')
        .eq('is_deleted', false)
        .order('name');

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const searchTools = async () => {
    if (searchQuery.trim().length < 1) return;

    setSearching(true);
    try {
      const term = searchQuery.toLowerCase();

      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          *,
          owner:users!tools_current_owner_fkey(name)
        `)
        .order('number');

      if (toolsError) {
        console.error('Error fetching tools for search:', toolsError);
        return;
      }

      const toolIds = (toolsData || []).map(t => t.id);

      const { data: transactionsData, error: txError } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, timestamp')
        .in('tool_id', toolIds)
        .order('timestamp', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions for search:', txError);
      }

      const latestLocationByTool: Record<string, string> = {};
      (transactionsData || []).forEach(tx => {
        if (!latestLocationByTool[tx.tool_id]) {
          latestLocationByTool[tx.tool_id] = tx.location || '';
        }
      });

      const transformed = (toolsData || []).map(tool => ({
        ...tool,
        owner_name: tool.owner?.name || null,
        latest_location: latestLocationByTool[tool.id] || ''
      }));

      transformed.sort((a, b) => {
        const an = parseInt(String(a.number), 10);
        const bn = parseInt(String(b.number), 10);
        if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number));
        if (Number.isNaN(an)) return 1;
        if (Number.isNaN(bn)) return -1;
        return an - bn;
      });

      const filtered = transformed.filter(tool => {
        const matchesNumber = tool.number.toLowerCase().includes(term);
        const matchesName = tool.name.toLowerCase().includes(term);
        const matchesDescription = (tool.description || '').toLowerCase().includes(term);
        const matchesOwner = (tool.owner_name || '').toLowerCase().includes(term);
        const matchesLocation = (tool.latest_location || '').toLowerCase().includes(term);
        return (
          matchesNumber ||
          matchesName ||
          matchesDescription ||
          matchesOwner ||
          matchesLocation
        );
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching tools:', error);
    } finally {
      setSearching(false);
    }
  };

  const fetchToolsByIds = async (toolIds: string[]) => {
    if (!Array.isArray(toolIds) || toolIds.length === 0) return;
    try {
      const { data: toolsData, error } = await supabase
        .from('tools')
        .select('id, number, name, description, current_owner, company_id')
        .in('id', toolIds);

      if (error) {
        console.error('Error fetching tools by ids:', error);
        return;
      }

      setSelectedTools((prev) => {
        const existingIds = new Set(prev.map((tool) => tool.id));
        const merged = [...prev];
        (toolsData || []).forEach((tool: any) => {
          if (!existingIds.has(tool.id)) {
            merged.push(tool);
            existingIds.add(tool.id);
          }
        });
        return merged;
      });

      (toolsData || []).forEach((tool: any) => {
        fetchChecklistForTool(tool.id);
      });
    } catch (error) {
      console.error('Error fetching tools by ids:', error);
    }
  };

  const fetchChecklistForTool = async (toolId: string) => {
    if (checklistsByTool[toolId] || checklistsLoading[toolId]) return;
    setChecklistsLoading((prev) => ({ ...prev, [toolId]: true }));
    try {
      const { data, error } = await supabase
        .from('tool_checklists')
        .select('id, item_name, required')
        .eq('tool_id', toolId)
        .order('item_name');

      if (error) {
        console.error('Error fetching checklist:', error);
        return;
      }

      setChecklistsByTool((prev) => ({ ...prev, [toolId]: data || [] }));
    } finally {
      setChecklistsLoading((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  const toggleToolSelection = (tool: Tool) => {
    setSelectedTools((prev) => {
      const exists = prev.find((t) => t.id === tool.id);
      if (exists) {
        setChecklistsByTool((prevLists) => {
          const next = { ...prevLists };
          delete next[tool.id];
          return next;
        });
        setChecklistStatusByTool((prevStatuses) => {
          const next = { ...prevStatuses };
          delete next[tool.id];
          return next;
        });
        setChecklistCommentsByTool((prevComments) => {
          const next = { ...prevComments };
          delete next[tool.id];
          return next;
        });
        setChecklistsLoading((prevLoading) => {
          const next = { ...prevLoading };
          delete next[tool.id];
          return next;
        });
        return prev.filter((t) => t.id !== tool.id);
      }
      fetchChecklistForTool(tool.id);
      return [...prev, tool];
    });
  };

  const removeTool = (toolId: string) => {
    setSelectedTools((prev) => prev.filter((tool) => tool.id !== toolId));
    setChecklistsByTool((prev) => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
    setChecklistStatusByTool((prev) => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
    setChecklistCommentsByTool((prev) => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
    setChecklistsLoading((prev) => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
  };

  const addGroupTools = async (groupId: string) => {
    try {
      setGroupLoading(true);
      const { data, error } = await supabase
        .from('tool_group_members')
        .select('tools ( id, number, name, description, current_owner, company_id )')
        .eq('group_id', groupId);

      if (error) {
        console.error('Error fetching group tools:', error);
        return;
      }

      const toolsToAdd = (data || [])
        .map((row: any) => row.tools)
        .filter(Boolean) as Tool[];

      setSelectedTools((prev) => {
        const existingIds = new Set(prev.map((tool) => tool.id));
        const merged = [...prev];
        toolsToAdd.forEach((tool) => {
          if (!existingIds.has(tool.id)) {
            merged.push(tool);
            existingIds.add(tool.id);
          }
        });
        return merged;
      });

      toolsToAdd.forEach((tool) => {
        fetchChecklistForTool(tool.id);
      });
    } catch (error) {
      console.error('Error adding group tools:', error);
    } finally {
      setGroupLoading(false);
      setGroupPickerVisible(false);
    }
  };

  const getFilteredUsers = () => {
    const availableUsers = users.filter(u => u.id !== user?.id);
    if (!userSearchQuery.trim()) {
      return availableUsers;
    }
    return availableUsers.filter(u =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  };

  const checkForOpenIssues = async (toolIds: string[]) => {
    const issues: IssueItem[] = [];
    if (toolIds.length === 0) return issues;

    const { data: transactions, error: transError } = await supabase
      .from('tool_transactions')
      .select('id, tool_id')
      .in('tool_id', toolIds);

    if (transError || !transactions || transactions.length === 0) {
      return issues;
    }

    const transactionIds = transactions.map((t) => t.id);
    const transactionToolMap = new Map<string, string>(
      transactions.map((t) => [t.id, t.tool_id])
    );

    const { data: reportsData, error } = await supabase
      .from('checklist_reports')
      .select(`
        transaction_id,
        status,
        comments,
        created_at,
        checklist_item:tool_checklists(item_name)
      `)
      .in('transaction_id', transactionIds)
      .order('created_at', { ascending: false });

    if (error || !reportsData) {
      return issues;
    }

    const toolMap = new Map(selectedTools.map((tool) => [tool.id, tool]));

    reportsData.forEach((report: any) => {
      const toolId = transactionToolMap.get(report.transaction_id);
      const tool = toolId ? toolMap.get(toolId) : undefined;
      if (!tool) return;
      issues.push({
        tool,
        status: report.status,
        comments: report.comments,
        created_at: report.created_at,
        checklist_item_name: report.checklist_item?.item_name ?? null,
      });
    });

    return issues;
  };

  const handleTransfer = async () => {
    if (!isTransferFormValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const toolIds = selectedTools.map((tool) => tool.id);
    const issues = await checkForOpenIssues(toolIds);
    if (issues.length > 0) {
      setOpenIssues(issues);
      setWarningModalVisible(true);
      return;
    }

    proceedWithTransfer();
  };

  const proceedWithTransfer = async () => {
    if (!user?.id) return;
    setTransferring(true);

    try {
      let toUserId = user.id;
      if (!isClaimingAny) {
        const selectedUser = users.find(u =>
          `${u.name} (${u.role})` === toUser || u.name === toUser
        );
        toUserId = selectedUser?.id || user.id;
      }

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) {
        throw new Error('No access token found. Please log in again.');
      }

      const { SUPABASE_URL } = (Constants.expoConfig?.extra || {}) as Record<string, string>;
      const supabaseUrl = SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;

      const checklist_reports = Object.entries(checklistStatusByTool).flatMap(([toolId, statuses]) =>
        Object.entries(statuses)
          .filter(([_, status]) => status)
          .map(([itemId, status]) => ({
            tool_id: toolId,
            checklist_item_id: itemId,
            status: status === 'damaged'
              ? 'Damaged/Needs Repair'
              : 'Needs Replacement/Resupply',
            comments: checklistCommentsByTool[toolId]?.[itemId]?.trim() || null,
          }))
      );

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-transactions-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tool_ids: selectedTools.map((tool) => tool.id),
            to_user_id: toUserId,
            location: location.trim(),
            stored_at: storedAt.trim(),
            notes: notes.trim() || 'Multi-tool transfer via mobile app',
            checklist_reports,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer tools');
      }

      Alert.alert('Success', 'Tools transferred successfully!', [
        { text: 'OK', onPress: resetForm },
      ]);
    } catch (error) {
      console.error('Error transferring tools:', error);
      Alert.alert('Error', 'Failed to transfer tools. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  const resetForm = () => {
    setSelectedTools([]);
    setSearchQuery('');
    setSearchResults([]);
    setLocation('');
    setStoredAt('');
    setNotes('');
    setToUser('');
    setChecklistsByTool({});
    setChecklistStatusByTool({});
    setChecklistCommentsByTool({});
    setChecklistsLoading({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Transfer Multiple</Text>
          <Text style={styles.subtitle}>Select tools and transfer together</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by tool number, name, or owner..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator size="small" color="#2563eb" style={styles.searchLoader} />
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <ScrollView nestedScrollEnabled>
                {searchResults.map((item) => {
                  const selected = selectedTools.some((tool) => tool.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.searchResultItem}
                      onPress={() => toggleToolSelection(item)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultNumber}>#{item.number}</Text>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        <View style={styles.searchResultMetaRow}>
                          <Text style={styles.searchResultMetaText}>
                            Owner: {item.owner_name || 'Unassigned'}
                          </Text>
                          <Text style={styles.searchResultMetaText}>
                            Location: {item.latest_location || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.selectBadge, selected && styles.selectBadgeActive]}>
                        <Ionicons
                          name={selected ? 'checkmark' : 'add'}
                          size={16}
                          color={selected ? '#ffffff' : '#2563eb'}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.selectedSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Selected Tools ({selectedTools.length})</Text>
            <TouchableOpacity
              style={styles.groupButton}
              onPress={() => setGroupPickerVisible(true)}
            >
              <Ionicons name="folder-outline" size={18} color="#2563eb" />
              <Text style={styles.groupButtonText}>Add Group</Text>
            </TouchableOpacity>
          </View>
          {selectedTools.length === 0 ? (
            <Text style={styles.emptyText}>No tools selected yet.</Text>
          ) : (
            <View style={styles.selectedList}>
              {selectedTools.map((tool) => (
                <View key={tool.id} style={styles.selectedItem}>
                  <View>
                    <Text style={styles.selectedName}>{tool.name}</Text>
                    <Text style={styles.selectedNumber}>#{tool.number}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeTool(tool.id)}>
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.formSection, isTransferFormValid ? styles.formSectionValid : styles.formSectionInitial]}>
          <Text style={styles.sectionTitle}>Transfer Details</Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>To</Text>
            {isClaimingAny ? (
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={toUser || 'Me'}
                editable={false}
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  !toUser ? styles.inputInvalid : styles.inputValid,
                ]}
                onPress={() => setUserPickerVisible(true)}
              >
                <Text style={[styles.dropdownText, !toUser && { color: '#9ca3af' }]}>
                  {toUser || 'Select recipient'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Location *</Text>
            <TextInput
              style={[styles.textInput, location.trim() ? styles.inputValid : styles.inputInvalid]}
              placeholder="Where are you taking these?"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Stored At *</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, storedAt ? styles.inputValid : styles.inputInvalid]}
              onPress={() => setStoredAtPickerVisible(!storedAtPickerVisible)}
            >
              <Text style={[styles.dropdownText, !storedAt && { color: '#9ca3af' }]}>
                {storedAt || 'Select storage location'}
              </Text>
              <Ionicons
                name={storedAtPickerVisible ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>

            {storedAtPickerVisible && (
              <View style={styles.dropdownOptions}>
                {storedAtOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      storedAt === option && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      setStoredAt(option);
                      setStoredAtPickerVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      storedAt === option && styles.dropdownOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {storedAt === option && (
                      <Ionicons name="checkmark" size={16} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="Add any notes about this transfer..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {selectedTools.length > 0 && (
          <View style={styles.checklistSection}>
            <Text style={styles.sectionTitle}>Tool Checklist</Text>
            <View style={styles.checklistList}>
              {selectedTools.map((tool) => {
                const items = checklistsByTool[tool.id] || [];
                const loadingChecklist = checklistsLoading[tool.id];
                return (
                  <View key={tool.id} style={styles.checklistCard}>
                    <Text style={styles.checklistToolTitle}>
                      #{tool.number} - {tool.name}
                    </Text>
                    {loadingChecklist ? (
                      <Text style={styles.checklistEmptyText}>Loading checklist...</Text>
                    ) : items.length === 0 ? (
                      <Text style={styles.checklistEmptyText}>No checklist items</Text>
                    ) : (
                      <View style={styles.checklistItems}>
                        {items.map((item) => (
                          <View key={item.id} style={styles.checklistItemRow}>
                            <View style={styles.checklistItemLeft}>
                              <Text style={styles.checklistItemName}>{item.item_name}</Text>
                              {item.required && (
                                <View style={styles.requiredBadge}>
                                  <Text style={styles.requiredText}>Required</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.checklistItemActions}>
                              <TouchableOpacity
                                style={styles.checklistAction}
                                onPress={() => {
                                  setChecklistStatusByTool(prev => ({
                                    ...prev,
                                    [tool.id]: {
                                      ...prev[tool.id],
                                      [item.id]: prev[tool.id]?.[item.id] === 'damaged' ? null : 'damaged'
                                    }
                                  }))
                                }}
                              >
                                <View style={[
                                  styles.checkbox,
                                  checklistStatusByTool[tool.id]?.[item.id] === 'damaged' && styles.checkboxChecked
                                ]}>
                                  {checklistStatusByTool[tool.id]?.[item.id] === 'damaged' && (
                                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                                  )}
                                </View>
                                <Text style={styles.checkboxLabel}>Damaged</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.checklistAction}
                                onPress={() => {
                                  setChecklistStatusByTool(prev => ({
                                    ...prev,
                                    [tool.id]: {
                                      ...prev[tool.id],
                                      [item.id]: prev[tool.id]?.[item.id] === 'replace' ? null : 'replace'
                                    }
                                  }))
                                }}
                              >
                                <View style={[
                                  styles.checkbox,
                                  checklistStatusByTool[tool.id]?.[item.id] === 'replace' && styles.checkboxChecked
                                ]}>
                                  {checklistStatusByTool[tool.id]?.[item.id] === 'replace' && (
                                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                                  )}
                                </View>
                                <Text style={styles.checkboxLabel}>Replace</Text>
                              </TouchableOpacity>
                            </View>
                            {(checklistStatusByTool[tool.id]?.[item.id] === 'damaged' ||
                              checklistStatusByTool[tool.id]?.[item.id] === 'replace') && (
                              <TextInput
                                style={styles.checklistCommentInput}
                                placeholder="Add comments about the issue..."
                                value={checklistCommentsByTool[tool.id]?.[item.id] || ''}
                                onChangeText={(text) => {
                                  setChecklistCommentsByTool(prev => ({
                                    ...prev,
                                    [tool.id]: {
                                      ...prev[tool.id],
                                      [item.id]: text,
                                    }
                                  }))
                                }}
                                multiline
                                numberOfLines={2}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomButtonSection}>
          <TouchableOpacity
            onPress={handleTransfer}
            disabled={!isTransferFormValid || transferring}
            style={[
              styles.transferButton,
              (!isTransferFormValid || transferring) && styles.transferButtonDisabled,
            ]}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color="#ffffff" />
            <Text style={styles.transferButtonText}>
              {transferring ? 'Transferring...' : 'Finish Transfer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={groupPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setGroupPickerVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Group</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.groupList}>
              {groups.length === 0 ? (
                <Text style={styles.emptyText}>No groups available.</Text>
              ) : (
                groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.groupItem}
                    onPress={() => addGroupTools(group.id)}
                    disabled={groupLoading}
                  >
                    <View>
                      <Text style={styles.groupName}>{group.name}</Text>
                      {group.description && (
                        <Text style={styles.groupDescription}>{group.description}</Text>
                      )}
                    </View>
                    {groupLoading ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={userPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUserPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setUserPickerVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Recipient</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.userSearchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.userSearchInput}
              placeholder="Search users..."
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={getFilteredUsers()}
            keyExtractor={(item) => item.id}
            style={styles.userList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => {
                  setToUser(item.name);
                  setUserPickerVisible(false);
                  setUserSearchQuery('');
                }}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userDetails}>{item.email} • {item.role}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={warningModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWarningModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setWarningModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>⚠️ Open Issues</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Some tools have open issues</Text>
              <Text style={styles.warningSubtitle}>
                Review the issues below before proceeding.
              </Text>

              <View style={styles.issuesList}>
                {openIssues.map((issue, index) => (
                  <View key={`${issue.tool.id}-${index}`} style={styles.issueItem}>
                    <Text style={styles.issueTool}>
                      #{issue.tool.number} {issue.tool.name}
                    </Text>
                    <Text style={styles.issueStatus}>{issue.status}</Text>
                    {issue.checklist_item_name && (
                      <Text style={styles.issueItemName}>{issue.checklist_item_name}</Text>
                    )}
                    {issue.comments && (
                      <Text style={styles.issueComments}>"{issue.comments}"</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.warningActions}>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setWarningModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => {
                setWarningModalVisible(false);
                proceedWithTransfer();
              }}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  searchLoader: {
    marginLeft: 8,
  },
  searchResults: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
    maxHeight: 320,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultContent: {
    flex: 1,
    paddingRight: 12,
  },
  searchResultNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 2,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  searchResultOwner: {
    fontSize: 13,
    color: '#6b7280',
  },
  searchResultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  searchResultMetaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  selectBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBadgeActive: {
    backgroundColor: '#2563eb',
  },
  selectedSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  selectedList: {
    gap: 10,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedNumber: {
    fontSize: 12,
    color: '#6b7280',
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  formSectionInitial: {
    backgroundColor: '#fef9c3',
  },
  formSectionValid: {
    backgroundColor: '#ecfdf5',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#1f2937',
  },
  inputInvalid: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  inputValid: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  notesInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1f2937',
  },
  dropdownOptions: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#1f2937',
  },
  dropdownOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  bottomButtonSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  transferButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferButtonDisabled: {
    opacity: 0.5,
  },
  transferButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  checklistSection: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  checklistList: {
    gap: 12,
  },
  checklistCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  checklistToolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  checklistItems: {
    gap: 10,
  },
  checklistItemRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 10,
  },
  checklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  checklistItemName: {
    fontSize: 13,
    color: '#111827',
  },
  requiredBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requiredText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '600',
  },
  checklistItemActions: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  checklistCommentInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  checklistAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#374151',
  },
  checklistEmptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  userList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  groupItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContent: {
    flex: 1,
  },
  warningContent: {
    flex: 1,
    padding: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  issuesList: {
    gap: 12,
  },
  issueItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  issueTool: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  issueStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  issueItemName: {
    fontSize: 13,
    color: '#6b7280',
  },
  issueComments: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  warningActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  goBackButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
