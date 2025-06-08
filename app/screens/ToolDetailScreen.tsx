import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

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
}

interface ToolImage {
  id: string;
  image_url: string;
  uploaded_at: string;
}

interface LatestTransaction {
  location: string;
  stored_at: string;
  timestamp: string;
  notes: string;
  from_user_name?: string;
  to_user_name?: string;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  required: boolean;
  status?: 'ok' | 'damaged' | 'needs_replacement';
  comments?: string;
}

interface ToolDetailScreenProps {
  route: {
    params: {
      tool: Tool;
    };
  };
  navigation: any;
}

export default function ToolDetailScreen({ route, navigation }: ToolDetailScreenProps) {
  const { tool } = route.params;
  const { user } = useAuth();
  const [images, setImages] = useState<ToolImage[]>([]);
  const [latestTransaction, setLatestTransaction] = useState<LatestTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Claim modal state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [location, setLocation] = useState('');
  const [storedAt, setStoredAt] = useState('');
  const [storedAtPickerVisible, setStoredAtPickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Warning modal state
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [openIssues, setOpenIssues] = useState<any[]>([]);

  const storedAtOptions = ['On Truck', 'On Job Site', 'N/A'];

  useEffect(() => {
    fetchToolDetails();
  }, []);

  const fetchToolDetails = async () => {
    try {
      // Fetch tool images
      const { data: imagesData, error: imagesError } = await supabase
        .from('tool_images')
        .select('*')
        .eq('tool_id', tool.id)
        .order('uploaded_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching tool images:', imagesError);
      } else {
        setImages(imagesData || []);
      }

      // Fetch latest transaction for location info
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .select(`
          location,
          stored_at,
          timestamp,
          notes,
          from_user_id,
          to_user_id,
          deleted_from_user_name,
          deleted_to_user_name,
          from_user:users!tool_transactions_from_user_id_fkey(name),
          to_user:users!tool_transactions_to_user_id_fkey(name)
        `)
        .eq('tool_id', tool.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (transactionError) {
        console.error('Error fetching tool transactions:', transactionError);
      } else if (transactionData && transactionData.length > 0) {
        const transaction = transactionData[0];
        setLatestTransaction({
          location: transaction.location,
          stored_at: transaction.stored_at,
          timestamp: transaction.timestamp,
          notes: transaction.notes,
          from_user_name: transaction.deleted_from_user_name || (transaction.from_user as any)?.name,
          to_user_name: transaction.deleted_to_user_name || (transaction.to_user as any)?.name,
        });
      }

      // Fetch checklist items
      const { data: checklistData, error: checklistError } = await supabase
        .from('tool_checklists')
        .select('*')
        .eq('tool_id', tool.id)
        .order('item_name');

      if (checklistError) {
        console.error('Error fetching checklist:', checklistError);
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
      console.error('Error fetching tool details:', error);
    } finally {
      setLoading(false);
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

  const handleClaimOwnership = async () => {
    if (!tool || tool.current_owner === user?.id) {
      Alert.alert('Error', 'This tool is already assigned to you');
      return;
    }

    // Check for open issues first
    const issues = await checkForOpenIssues(tool.id);
    if (issues.length > 0) {
      setOpenIssues(issues);
      setWarningModalVisible(true);
      return;
    }

    // No issues found, proceed with claim
    proceedWithClaim();
  };

  const proceedWithClaim = () => {
    // Clear location and stored at fields - user must fill them in
    setLocation('');
    setStoredAt('');
    setNotes(`Tool claimed by ${user?.user_metadata?.name || user?.email}`);
    
    // Reset checklist items to default 'ok' status
    setChecklistItems(prev => prev.map(item => ({
      ...item,
      status: 'ok',
      comments: '',
    })));

    setClaimModalVisible(true);
  };

  const handleClaimSubmit = async () => {
    if (!location.trim() || !storedAt.trim()) {
      Alert.alert('Error', 'Please fill in both Location and Stored At fields');
      return;
    }

    setClaiming(true);

    try {
      // Create the transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert({
          tool_id: tool.id,
          from_user_id: tool.current_owner,
          to_user_id: user?.id,
          location: location.trim(),
          stored_at: storedAt.trim(),
          notes: notes.trim() || `Tool claimed by ${user?.user_metadata?.name || user?.email}`,
          company_id: tool.company_id,
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
          company_id: tool.company_id,
        }));

      if (reportsToInsert.length > 0) {
        const { error: reportError } = await supabase
          .from('checklist_reports')
          .insert(reportsToInsert);

        if (reportError) {
          console.error('Error creating checklist reports:', reportError);
          // Continue anyway - the main transaction succeeded
        }
      }

      // Update the tool's current owner
      const { error: toolError } = await supabase
        .from('tools')
        .update({ current_owner: user?.id })
        .eq('id', tool.id);

      if (toolError) {
        throw toolError;
      }

      Alert.alert(
        'Success', 
        'Tool ownership claimed successfully!',
        [{ text: 'OK', onPress: () => {
          setClaimModalVisible(false);
          navigation.goBack();
        }}]
      );
    } catch (error) {
      console.error('Error claiming tool:', error);
      Alert.alert('Error', 'Failed to claim tool ownership. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const updateChecklistItem = (itemId: string, status: 'ok' | 'damaged' | 'needs_replacement', comments?: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status, comments: comments || item.comments }
        : item
    ));
  };

  const handleChecklistSubmit = async () => {
    setClaiming(true);

    try {
      // Create a "self-transfer" to generate checklist report
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert({
          tool_id: tool.id,
          from_user_id: user?.id,
          to_user_id: user?.id,
          location: latestTransaction?.location || 'Current Location',
          stored_at: latestTransaction?.stored_at || 'N/A',
          notes: `Checklist report submitted by ${user?.user_metadata?.name || user?.email}`,
          company_id: tool.company_id,
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
          company_id: tool.company_id,
        }));

      if (reportsToInsert.length > 0) {
        const { error: reportError } = await supabase
          .from('checklist_reports')
          .insert(reportsToInsert);

        if (reportError) {
          throw reportError;
        }

        Alert.alert(
          'Success', 
          `Checklist report submitted successfully! ${reportsToInsert.length} issue(s) reported.`,
          [{ text: 'OK', onPress: () => {
            // Reset checklist items back to 'ok' status
            setChecklistItems(prev => prev.map(item => ({
              ...item,
              status: 'ok',
              comments: '',
            })));
            // Navigate back to My Tools screen
            navigation.goBack();
          }}]
        );
      } else {
        Alert.alert(
          'No Issues Found', 
          'All checklist items are marked as OK. No report needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error submitting checklist report:', error);
      Alert.alert('Error', 'Failed to submit checklist report. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const renderImageGallery = () => {
    if (images.length === 0) {
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
        {images.map((image, index) => (
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

  const renderReadOnlyChecklistSection = () => {
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
          Items that will be checked during transfers and inspections
        </Text>
        
        {checklistItems.map((item) => (
          <View key={item.id} style={styles.readOnlyChecklistItem}>
            <View style={styles.checklistItemInfo}>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tool Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tool details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tool Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tool Images */}
        <View style={styles.section}>
          {renderImageGallery()}
        </View>

        {/* Tool Information */}
        <View style={styles.section}>
          <View style={styles.toolHeader}>
            <View style={styles.toolInfo}>
              <Text style={styles.toolNumber}>#{tool.number}</Text>
              <Text style={styles.toolName}>{tool.name}</Text>
            </View>
            {tool.current_owner === user?.id && (
              <View style={styles.ownedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.ownedText}>Owned</Text>
              </View>
            )}
          </View>

          {tool.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.description}>{tool.description}</Text>
            </View>
          )}
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Ionicons name="person-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>Current Owner</Text>
                <Text style={styles.statusValue}>
                  {tool.owner_name || 'Unassigned'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Ionicons name="location-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>Current Location</Text>
                <Text style={styles.statusValue}>
                  {latestTransaction?.location || 'Location not specified'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Ionicons name="car-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>Stored At</Text>
                <Text style={styles.statusValue}>
                  {latestTransaction?.stored_at || 'N/A'}
                </Text>
              </View>
            </View>

            {latestTransaction?.timestamp && (
              <View style={styles.statusRow}>
                <View style={styles.statusIcon}>
                  <Ionicons name="time-outline" size={20} color="#6b7280" />
                </View>
                <View style={styles.statusContent}>
                  <Text style={styles.statusLabel}>Last Updated</Text>
                  <Text style={styles.statusValue}>
                    {new Date(latestTransaction.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Latest Transaction Notes */}
        {latestTransaction?.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Transaction Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{latestTransaction.notes}</Text>
            </View>
          </View>
        )}

        {/* Tool Checklist */}
        <View style={styles.section}>
          {tool.current_owner === user?.id ? (
            // Interactive checklist for owners
            <>
              <Text style={styles.sectionTitle}>Tool Inspection Checklist</Text>
              <Text style={styles.checklistSubtitle}>
                Check any items that need attention and submit a report
              </Text>
              {renderChecklistSection()}
            </>
          ) : (
            // Read-only checklist for non-owners
            <>
              <Text style={styles.sectionTitle}>Tool Inspection Checklist</Text>
              <Text style={styles.checklistSubtitle}>
                Items that will be checked during transfers and inspections
              </Text>
              {renderReadOnlyChecklistSection()}
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomSection}>
        {tool.current_owner !== user?.id ? (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={handleClaimOwnership}
          >
            <Ionicons name="hand-left-outline" size={20} color="#ffffff" />
            <Text style={styles.claimButtonText}>Claim Ownership</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.submitChecklistButton}
            onPress={handleChecklistSubmit}
            disabled={claiming}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.submitChecklistButtonText}>
              {claiming ? 'Submitting...' : 'Submit Checklist Report'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Claim Ownership Modal */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setClaimModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Claim Tool Ownership</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Tool Info */}
            <View style={styles.modalToolInfo}>
              <Text style={styles.modalToolNumber}>#{tool.number}</Text>
              <Text style={styles.modalToolName}>{tool.name}</Text>
              <Text style={styles.modalTransferInfo}>
                From: {tool.owner_name || 'Unassigned'} → You
              </Text>
            </View>

            {/* Tool Images */}
            <View style={styles.section}>
              {renderImageGallery()}
            </View>

            {/* Required Fields */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Where are you taking this?"
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Stored At *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
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
                placeholder="Add any notes about claiming this tool..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Claim Tool Button */}
            <View style={styles.bottomButtonSection}>
              <TouchableOpacity
                onPress={handleClaimSubmit}
                disabled={claiming}
                style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
              >
                <Ionicons name="hand-left-outline" size={20} color="#ffffff" />
                <Text style={styles.claimButtonText}>
                  {claiming ? 'Claiming...' : 'Claim Tool'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
                  By proceeding, you acknowledge these issues and accept responsibility for this tool.
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
                proceedWithClaim();
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
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
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageGallery: {
    marginVertical: 8,
  },
  imageGalleryContent: {
    paddingHorizontal: 8,
  },
  toolImage: {
    width: width * 0.7,
    height: 200,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  noImagesContainer: {
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noImagesText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  toolInfo: {
    flex: 1,
  },
  toolNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  toolName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ownedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4,
  },
  descriptionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  bottomSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomButtonSection: {
    padding: 16,
    paddingBottom: 32,
  },
  claimButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitChecklistButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitChecklistButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
  },
  modalToolInfo: {
    padding: 16,
  },
  modalToolNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  modalToolName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalTransferInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputSection: {
    padding: 16,
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
  },
  notesInput: {
    height: 100,
  },
  checklistSection: {
    padding: 16,
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
  },
  checklistItem: {
    paddingVertical: 16,
    marginBottom: 16,
  },
  readOnlyChecklistItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  },
  noChecklistContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChecklistText: {
    fontSize: 16,
    color: '#6b7280',
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
  // Warning modal styles
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