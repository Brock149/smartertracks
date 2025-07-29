import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  Modal,
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
  company_id: string;
  owner_name?: string;
  latest_location?: string;
  images?: ToolImage[];
}

interface ToolImage {
  id: string;
  image_url: string;
  uploaded_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  required: boolean;
  status?: 'ok' | 'damaged' | 'needs_replacement';
  comments?: string;
}

export default function TransferToolsScreen({ route }: { route?: any }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tool[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Selected tool state
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolImages, setToolImages] = useState<ToolImage[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Transfer form state
  const [fromUser, setFromUser] = useState<string>('');
  const [toUser, setToUser] = useState<string>('');
  const [location, setLocation] = useState('');
  const [storedAt, setStoredAt] = useState('');
  const [storedAtPickerVisible, setStoredAtPickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Derived state – are the required transfer fields filled in?
  // 'user' is defined later, so wrap validity computation in a function we'll call after that

  // User picker state
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Warning modal state
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [openIssues, setOpenIssues] = useState<any[]>([]);
  
  // Current user info
  const [currentUserName, setCurrentUserName] = useState<string>('');
  
  const { user } = useAuth();

  const isTransferFormValid = (
    location.trim().length > 0 &&
    storedAt.trim().length > 0 &&
    (
      // If user owns the tool, 'toUser' must be selected, otherwise ok
      (selectedTool?.current_owner === user?.id ? toUser.trim().length > 0 : true)
    )
  );
  
  const storedAtOptions = ['On Truck', 'On Job Site', 'N/A'];

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserName();
  }, []);

  // Handle pre-selected tool from navigation params
  useEffect(() => {
    console.log('Route params:', route?.params);
    if (route?.params?.selectedTool) {
      console.log('Pre-selecting tool:', route.params.selectedTool);
      selectTool(route.params.selectedTool);
    }
  }, [route?.params?.selectedTool]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
      fetchCurrentUserName();

      // If a tool was passed via navigation params, (re)select it on focus
      if (route?.params?.selectedTool) {
        selectTool(route.params.selectedTool);
      }
      // We intentionally do NOT clear the param here so that repeated navigations
      // with the same tool still trigger this logic when the screen gains focus again.
    }, [route?.params?.selectedTool])
  );

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      searchTools();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

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

  const fetchCurrentUserName = async () => {
    if (!user?.id) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching current user name:', error);
        return;
      }

      setCurrentUserName(userData?.name || 'Me');
    } catch (error) {
      console.error('Error fetching current user name:', error);
      setCurrentUserName('Me');
    }
  };

  const searchTools = async () => {
    if (searchQuery.trim().length < 1) return;

    setSearching(true);
    try {
      const term = searchQuery.toLowerCase();

      // 1. Fetch all tools for the company with owner info
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

      // 2. Fetch latest transactions for these tools (needed for location)
      const { data: transactionsData, error: txError } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, timestamp')
        .in('tool_id', toolIds)
        .order('timestamp', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions for search:', txError);
      }

      // Build map tool_id -> latest location
      const latestLocationByTool: Record<string, string> = {};
      (transactionsData || []).forEach(tx => {
        if (!latestLocationByTool[tx.tool_id]) {
          latestLocationByTool[tx.tool_id] = tx.location || '';
        }
      });

      // 3. Transform tools with owner and latest location
      const transformed = (toolsData || []).map(tool => ({
        ...tool,
        owner_name: tool.owner?.name || null,
        latest_location: latestLocationByTool[tool.id] || ''
      }));

      // 4. Local filtering (number, name, description, owner, location)
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
      }).slice(0, 20);

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching tools:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectTool = async (tool: Tool) => {
    setSelectedTool(tool);
    setSearchQuery('');
    setSearchResults([]);
    
    // Auto-fill owner information
    setFromUser(tool.owner_name || 'Unassigned');
    
    // Auto-fill recipient based on ownership
    if (tool.current_owner === user?.id) {
      // User owns the tool - they'll choose recipient
      setToUser('');
    } else {
      // User doesn't own tool - they're claiming it
      setToUser(currentUserName || 'Me');
    }

    // Reset form fields
    setLocation('');
    setStoredAt('');
    setNotes('');

    // Fetch tool details
    await Promise.all([
      fetchToolImages(tool.id),
      fetchToolChecklist(tool.id)
    ]);
  };

  const fetchToolImages = async (toolId: string) => {
    try {
      const { data: imagesData, error } = await supabase
        .from('tool_images')
        .select('*')
        .eq('tool_id', toolId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching tool images:', error);
      } else {
        setToolImages(imagesData || []);
      }
    } catch (error) {
      console.error('Error fetching tool images:', error);
    }
  };

  const fetchToolChecklist = async (toolId: string) => {
    try {
      const { data: checklistData, error } = await supabase
        .from('tool_checklists')
        .select('*')
        .eq('tool_id', toolId)
        .order('item_name');

      if (error) {
        console.error('Error fetching checklist:', error);
      } else {
        const items = (checklistData || []).map(item => ({
          id: item.id,
          item_name: item.item_name,
          required: item.required,
          status: 'ok' as const,
          comments: '',
        }));
        setChecklistItems(items);
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    }
  };

  const checkForOpenIssues = async (toolId: string): Promise<any[]> => {
    try {
      // First get transactions for this tool, then get checklist reports for those transactions
      const { data: transactions, error: transError } = await supabase
        .from('tool_transactions')
        .select('id')
        .eq('tool_id', toolId);

      if (transError) {
        console.error('Error fetching transactions:', transError);
        return [];
      }

      if (!transactions || transactions.length === 0) {
        return [];
      }

      const transactionIds = transactions.map(t => t.id);

      // Get all checklist reports for these transactions (all existing reports are unresolved)
      const { data: reportsData, error } = await supabase
        .from('checklist_reports')
        .select(`
          *,
          checklist_item:tool_checklists(item_name),
          transaction:tool_transactions(timestamp)
        `)
        .in('transaction_id', transactionIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching checklist reports:', error);
        return [];
      }

      return reportsData || [];
    } catch (error) {
      console.error('Error checking for open issues:', error);
      return [];
    }
  };

  const handleTransfer = async () => {
    if (!selectedTool) {
      Alert.alert('Error', 'No tool selected');
      return;
    }

    if (!location.trim() || !storedAt.trim()) {
      Alert.alert('Error', 'Please fill in both Location and Stored At fields');
      return;
    }

    // If user owns the tool, they must select a recipient
    if (selectedTool.current_owner === user?.id && !toUser.trim()) {
      Alert.alert('Error', 'Please select who will receive this tool');
      return;
    }

    // Check for open issues first
    const issues = await checkForOpenIssues(selectedTool.id);
    if (issues.length > 0) {
      setOpenIssues(issues);
      setWarningModalVisible(true);
      return;
    }

    // No issues found, proceed with transfer
    proceedWithTransfer();
  };

  const proceedWithTransfer = async () => {
    if (!selectedTool) return; // Extra safety check
    
    setTransferring(true);

    try {
      // Get recipient user ID if transferring to someone specific
      let toUserId = null;
      if (selectedTool.current_owner === user?.id) {
        // Find the selected recipient
        const selectedUser = users.find(u => 
          `${u.name} (${u.role})` === toUser || u.name === toUser
        );
        toUserId = selectedUser?.id || null;
      } else {
        // User is claiming the tool
        toUserId = user?.id;
      }

      // Normalize the location using our SQL function
      const { data: normalizedLocationData, error: normalizeError } = await supabase
        .rpc('normalize_location', {
          p_company_id: selectedTool.company_id,
          p_input_location: location.trim()
        });

      if (normalizeError) {
        console.error('Error normalizing location:', normalizeError);
        // Continue with original location if normalization fails
      }

      const finalLocation = normalizedLocationData || location.trim();

      // Create the transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert({
          tool_id: selectedTool.id,
          from_user_id: selectedTool.current_owner,
          to_user_id: toUserId,
          location: finalLocation,
          stored_at: storedAt.trim(),
          notes: notes.trim() || `Tool transferred via mobile app`,
          company_id: selectedTool.company_id,
        })
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      // Create checklist reports for items that need attention
      const reportsToInsert = checklistItems
        .filter(item => item.status !== 'ok')
        .map(item => ({
          transaction_id: transactionData.id,
          checklist_item_id: item.id,
          status: item.status === 'damaged' ? 'Damaged/Needs Repair' : 'Needs Replacement/Resupply',
          comments: item.comments?.trim() || '',
          company_id: selectedTool.company_id,
        }));

      if (reportsToInsert.length > 0) {
        const { error: reportError } = await supabase
          .from('checklist_reports')
          .insert(reportsToInsert);

        if (reportError) {
          console.error('Error creating checklist reports:', reportError);
        }
      }

      // Update the tool's current owner
      const { error: toolError } = await supabase
        .from('tools')
        .update({ current_owner: toUserId })
        .eq('id', selectedTool.id);

      if (toolError) {
        throw toolError;
      }

      Alert.alert(
        'Success', 
        'Tool transferred successfully!',
        [{ text: 'OK', onPress: resetForm }]
      );
    } catch (error) {
      console.error('Error transferring tool:', error);
      Alert.alert('Error', 'Failed to transfer tool. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  const resetForm = () => {
    setSelectedTool(null);
    setToolImages([]);
    setChecklistItems([]);
    setFromUser('');
    setToUser('');
    setLocation('');
    setStoredAt('');
    setNotes('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateChecklistItem = (itemId: string, status: 'ok' | 'damaged' | 'needs_replacement', comments?: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status, comments: comments || item.comments }
        : item
    ));
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

  const renderImageGallery = () => {
    if (toolImages.length === 0) {
      return (
        <View style={styles.noImagesContainer}>
          <Ionicons name="camera-outline" size={64} color="#d1d5db" />
          <Text style={styles.noImagesText}>No photos available</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.imageGallery}
        contentContainerStyle={styles.imageGalleryContent}
      >
        {toolImages.map((image, index) => (
          <Image
            key={image.id}
            source={{ uri: image.image_url }}
            style={styles.toolImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    );
  };

  const renderChecklistSection = () => {
    if (checklistItems.length === 0) {
      return (
        <View style={styles.noChecklistContainer}>
          <Text style={styles.noChecklistText}>No checklist items for this tool</Text>
        </View>
      );
    }

    return (
      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>Tool Inspection Checklist</Text>
        <Text style={styles.checklistSubtitle}>
          Check any items that need attention
        </Text>
        
        {checklistItems.map((item) => (
          <View key={item.id} style={styles.checklistItem}>
            <View style={styles.checklistHeader}>
              <View style={styles.checklistItemInfo}>
                <Text style={styles.checklistItemName}>{item.item_name}</Text>
                {item.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  const newStatus = item.status === 'damaged' ? 'ok' : 'damaged';
                  updateChecklistItem(item.id, newStatus);
                }}
              >
                <View style={[
                  styles.checkbox,
                  item.status === 'damaged' && styles.checkboxChecked
                ]}>
                  {item.status === 'damaged' && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Needs Repair</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  const newStatus = item.status === 'needs_replacement' ? 'ok' : 'needs_replacement';
                  updateChecklistItem(item.id, newStatus);
                }}
              >
                <View style={[
                  styles.checkbox,
                  item.status === 'needs_replacement' && styles.checkboxChecked
                ]}>
                  {item.status === 'needs_replacement' && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Needs Replacement</Text>
              </TouchableOpacity>
            </View>

            {(item.status === 'damaged' || item.status === 'needs_replacement') && (
              <TextInput
                style={styles.commentsInput}
                placeholder="Add comments about the issue..."
                value={item.comments}
                onChangeText={(text) => updateChecklistItem(item.id, item.status!, text)}
                multiline
                numberOfLines={2}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {selectedTool && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={resetForm}
          >
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Transfer Tool</Text>
          <Text style={styles.subtitle}>
            {selectedTool ? `${selectedTool.number} - ${selectedTool.name}` : 'Search for a tool to transfer'}
          </Text>
        </View>
      </View>

      {!selectedTool ? (
        // Search Interface
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
          </View>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={styles.searchResults}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.searchResultItem}
                  onPress={() => selectTool(item)}
                >
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultNumber}>#{item.number}</Text>
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultOwner}>
                      Owner: {item.owner_name || 'Unassigned'}
                    </Text>
                    {item.latest_location !== undefined && (
                      <Text style={styles.searchResultOwner}>
                        Location: {item.latest_location || 'Unknown'}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            />
          )}

                     {searchQuery.length >= 1 && searchResults.length === 0 && !searching && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.noResultsText}>No tools found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          )}
        </View>
      ) : (
        // Transfer Form
        <ScrollView
          style={[
            styles.transferForm,
            isTransferFormValid ? styles.formContainerValid : styles.formContainerInitial,
          ]}
        >
          {/* Selected Tool Info */}
          <View
            style={[
              styles.selectedToolSection,
              isTransferFormValid ? styles.sectionValid : styles.sectionInitial,
            ]}
          >
            <View style={styles.toolHeaderInfo}>
              <View style={styles.toolTitleRow}>
                <View>
                  <Text style={styles.selectedToolNumber}>#{selectedTool.number}</Text>
                  <Text style={styles.selectedToolName}>{selectedTool.name}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.changeToolButton}
                  onPress={resetForm}
                >
                  <Text style={styles.changeToolText}>Change Tool</Text>
                </TouchableOpacity>
              </View>
              
              {selectedTool.description && (
                <Text style={styles.selectedToolDescription}>{selectedTool.description}</Text>
              )}
            </View>

            {/* Tool Images */}
            <View style={styles.section}>
              {renderImageGallery()}
            </View>

            {/* Transfer Details */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={fromUser}
                editable={false}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>To</Text>
              {selectedTool.current_owner === user?.id ? (
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setUserPickerVisible(true)}
                >
                  <Text style={[styles.dropdownText, !toUser && { color: '#9ca3af' }]}>
                    {toUser || 'Select recipient'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.textInput, styles.disabledInput]}
                  value={toUser}
                  editable={false}
                />
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  location.trim() === '' ? styles.inputInvalid : styles.inputValid,
                ]}
                placeholder="Where are you taking this?"
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Stored At *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  storedAt.trim() === '' ? styles.inputInvalid : styles.inputValid,
                ]}
                onPress={() => setStoredAtPickerVisible(!storedAtPickerVisible)}
              >
                <Text style={[styles.dropdownText, !storedAt && { color: '#9ca3af' }]}>
                  {storedAt || 'Select storage location'}
                </Text>
                <Ionicons 
                  name={storedAtPickerVisible ? "chevron-up" : "chevron-down"} 
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

            {/* Checklist Section */}
            {renderChecklistSection()}

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

            {/* Transfer Button */}
            <View style={styles.bottomButtonSection}>
              <TouchableOpacity
                onPress={handleTransfer}
                disabled={!isTransferFormValid || transferring}
                style={[
                  styles.transferButton,
                  (!isTransferFormValid || transferring)
                    ? styles.finishTransferButtonDisabled
                    : styles.finishTransferButtonEnabled,
                ]}
              >
                <Ionicons name="swap-horizontal-outline" size={20} color="#ffffff" />
                <Text style={styles.transferButtonText}>
                  {transferring ? 'Transferring...' : 'Finish Tool Transfer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* User Picker Modal */}
      <Modal
        visible={userPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUserPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setUserPickerVisible(false)}
              style={styles.cancelButton}
            >
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

      {/* Warning Modal for Open Issues */}
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
            <Text style={styles.modalTitle}>⚠️ Tool Warning</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.warningContent}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={48} color="#f59e0b" />
                <Text style={styles.warningTitle}>This tool has open issues</Text>
                <Text style={styles.warningSubtitle}>
                  The following problems have been reported and not yet resolved:
                </Text>
              </View>

              <View style={styles.issuesList}>
                {openIssues.map((issue, index) => (
                  <View key={issue.id} style={styles.issueItem}>
                    <View style={styles.issueHeader}>
                      <Ionicons 
                        name={issue.status.includes('Damaged') ? 'build-outline' : 'swap-horizontal-outline'} 
                        size={20} 
                        color={issue.status.includes('Damaged') ? '#dc2626' : '#f59e0b'} 
                      />
                      <Text style={styles.issueItemName}>
                        {issue.checklist_item?.item_name || 'Unknown Item'}
                      </Text>
                    </View>
                    <Text style={styles.issueStatus}>{issue.status}</Text>
                    {issue.comments && (
                      <Text style={styles.issueComments}>"{issue.comments}"</Text>
                    )}
                    <Text style={styles.issueDate}>
                      Reported: {new Date(issue.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.warningNote}>
                <Text style={styles.warningNoteText}>
                  By proceeding, you acknowledge these issues and {selectedTool?.current_owner === user?.id ? 'the recipient will be informed' : 'accept responsibility for this tool'}.
                </Text>
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
              <Text style={styles.proceedButtonText}>Understood, proceed</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
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
  searchSection: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResults: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  searchResultOwner: {
    fontSize: 14,
    color: '#6b7280',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  transferForm: {
    flex: 1,
  },
  selectedToolSection: {
    backgroundColor: '#ffffff', // default but overridden dynamically
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionInitial: {
    backgroundColor: '#fef9c3',
  },
  sectionValid: {
    backgroundColor: '#ecfdf5',
  },
  toolHeaderInfo: {
    marginBottom: 16,
  },
  toolTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectedToolNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  selectedToolName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  changeToolButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeToolText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  selectedToolDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    color: '#1f2937',
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  notesInput: {
    height: 100,
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
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownOptions: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  imageGallery: {
    marginVertical: 8,
  },
  imageGalleryContent: {
    paddingHorizontal: 8,
  },
  toolImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  noImagesContainer: {
    height: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noImagesText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  checklistSection: {
    marginBottom: 16,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  checklistSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  checklistItem: {
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checklistHeader: {
    marginBottom: 12,
  },
  checklistItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  requiredBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
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
    fontSize: 16,
    color: '#1f2937',
  },
  commentsInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
  },
  noChecklistContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noChecklistText: {
    fontSize: 16,
    color: '#6b7280',
  },
  bottomButtonSection: {
    paddingTop: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  // ---- Transfer flow enhanced styles ----
  finishTransferButtonEnabled: {
    backgroundColor: '#22c55e',
  },
  finishTransferButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  formContainerInitial: {
    backgroundColor: '#fef9c3',
  },
  formContainerValid: {
    backgroundColor: '#ecfdf5',
  },
  inputInvalid: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  inputValid: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
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
  // Warning modal styles
  modalContent: {
    flex: 1,
  },
  warningContent: {
    flex: 1,
    padding: 16,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  issuesList: {
    marginBottom: 24,
  },
  issueItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  issueStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  issueComments: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  issueDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  warningNote: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningNoteText: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 20,
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
    flex: 2,
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