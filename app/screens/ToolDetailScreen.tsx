import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import {
  fetchToolTracker,
  fetchToolLocation,
  fetchCompanyTrackerPool,
  attachTracker,
  detachTracker,
  trackerDisplayName,
  type ToolTracker,
  type ToolLocation,
  type PoolTracker,
  type MountType,
} from '../services/trackers';
import TrackerMap from '../components/TrackerMap';
import { Image as ExpoImage } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { resize } from '../utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  thumb_url?: string | null;
}

interface LatestTransaction {
  location: string;
  stored_at: string;
  timestamp: string;
  notes: string;
  attribution?: string | null;
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

function relativeTime(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ToolDetailScreen({ route, navigation }: ToolDetailScreenProps) {
  const { tool } = route.params;
  const { user, features } = useAuth();
  const trackersEnabled = features.trackersEnabled;
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<ToolImage[]>([]);
  const [latestTransaction, setLatestTransaction] = useState<LatestTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Image viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  // Claim modal state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [location, setLocation] = useState('');
  const [storedAt, setStoredAt] = useState('');
  const [storedAtPickerVisible, setStoredAtPickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [attemptedClaim, setAttemptedClaim] = useState(false);
  const [claimErrors, setClaimErrors] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Derived state – are the required claim fields filled in?
  const isClaimFormValid = location.trim().length > 0 && storedAt.trim().length > 0 && acknowledged;
  
  // Warning modal state
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [openIssues, setOpenIssues] = useState<any[]>([]);

  // GPS tracker state
  const [toolTracker, setToolTracker] = useState<ToolTracker | null>(null);
  const [toolLocation, setToolLocation] = useState<ToolLocation | null>(null);
  const [trackerPool, setTrackerPool] = useState<PoolTracker[]>([]);
  const [trackerBusy, setTrackerBusy] = useState(false);
  const [trackerRequired, setTrackerRequired] = useState(false);
  // Attach-during-claim selection (chosen in the claim form, applied on submit).
  const [claimTrackerSerial, setClaimTrackerSerial] = useState<string | null>(null);
  const [claimTrackerMount, setClaimTrackerMount] = useState<MountType>('temporary');

  const isOwner = tool.current_owner === user?.id;

  const storedAtOptions = ['On Truck', 'On Job Site', 'N/A'];

  useEffect(() => {
    fetchToolDetails();
    if (trackersEnabled) loadTrackerInfo();
  }, []);

  const loadTrackerInfo = async () => {
    try {
      const [active, loc, reqRes] = await Promise.all([
        fetchToolTracker(tool.id),
        fetchToolLocation(tool.id),
        supabase.from('tools').select('tracker_required').eq('id', tool.id).maybeSingle(),
      ]);
      setToolTracker(active);
      setToolLocation(loc);
      setTrackerRequired(!!reqRes.data?.tracker_required);
      // Fetch the company pool whenever nothing is attached — needed both for
      // the owner's attach control and for the attach-during-claim flow.
      if (!active) {
        try {
          setTrackerPool(await fetchCompanyTrackerPool());
        } catch {
          setTrackerPool([]);
        }
      } else {
        setTrackerPool([]);
      }
    } catch (e) {
      console.warn('Failed to load tracker info:', e);
    }
  };

  const handleAttachTracker = async (serial: string, mountType: MountType) => {
    try {
      setTrackerBusy(true);
      await attachTracker(serial, tool.id, mountType);
      await loadTrackerInfo();
    } catch (e: any) {
      Alert.alert('Could not attach tracker', e?.message || 'Please try again.');
    } finally {
      setTrackerBusy(false);
    }
  };

  const handleDetachTracker = async () => {
    Alert.alert('Detach tracker?', 'This returns the tracker to your company pool.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Detach',
        style: 'destructive',
        onPress: async () => {
          try {
            setTrackerBusy(true);
            await detachTracker(tool.id);
            await loadTrackerInfo();
          } catch (e: any) {
            Alert.alert('Could not detach tracker', e?.message || 'Please try again.');
          } finally {
            setTrackerBusy(false);
          }
        },
      },
    ]);
  };

  const openLocationInMaps = () => {
    if (toolLocation?.latitude == null || toolLocation?.longitude == null) return;
    const { latitude, longitude } = toolLocation;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const fetchToolDetails = async () => {
    try {
      // Fetch tool images
      const { data: imagesData, error: imagesError } = await supabase
        .from('tool_images')
        .select('id, image_url, thumb_url, uploaded_at, is_primary')
        .eq('tool_id', tool.id)
        .order('is_primary', { ascending: false })
        .order('uploaded_at', { ascending: true });

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
          attribution,
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
          attribution: (transaction as any).attribution || null,
          from_user_name: transaction.deleted_from_user_name
            ? `${transaction.deleted_from_user_name} (removed)`
            : (transaction.from_user as any)?.name,
          to_user_name: transaction.deleted_to_user_name
            ? `${transaction.deleted_to_user_name} (removed)`
            : (transaction.to_user as any)?.name,
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
    // Notes is now the tech's own free-text box. The "claimed by" line is
    // recorded separately (and non-editably) in the transaction's attribution.
    setNotes('');
    setAcknowledged(false);
    setAttemptedClaim(false);
    setClaimErrors([]);
    setClaimTrackerSerial(null);
    setClaimTrackerMount('temporary');
    
    // Reset checklist items to default 'ok' status
    setChecklistItems(prev => prev.map(item => ({
      ...item,
      status: 'ok',
      comments: '',
    })));

    setClaimModalVisible(true);
  };

  const handleClaimSubmit = async () => {
    // Validate and, on failure, stack a fresh set of red messages so repeated
    // taps make it visually obvious what's missing (per request).
    setAttemptedClaim(true);
    const missing: string[] = [];
    if (!location.trim()) missing.push('Must enter a location');
    if (!storedAt.trim()) missing.push('Must select where it’s stored');
    if (!acknowledged) missing.push('Must check responsibility acknowledgement');
    if (missing.length > 0) {
      setClaimErrors(prev => [...prev, ...missing]);
      return;
    }
    setClaimErrors([]);

    // Req 8: "tracker required" soft gate. Only meaningful for temporary-mount
    // tools (permanent mounts always have their tracker). Currently a soft
    // warning; to make this a hard block later, drop the "Sign out anyway"
    // option below.
    if (trackerRequired && !toolTracker && !claimTrackerSerial) {
      Alert.alert(
        'No tracker attached',
        'This tool is flagged to always have a GPS tracker when signed out. Pick one in the "GPS Tracker" section above, or you can attach one after claiming.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out anyway', style: 'destructive', onPress: () => void doClaim() },
        ]
      );
      return;
    }

    void doClaim();
  };

  const doClaim = async () => {
    setClaiming(true);

    try {
      // Normalize the location using our SQL function (only when company_id is available)
      let finalLocation = location.trim();
      if (tool.company_id) {
        const { data: normalizedLocationData, error: normalizeError } = await supabase
          .rpc('normalize_location', {
            p_company_id: tool.company_id,
            p_input_location: location.trim()
          });

        if (normalizeError) {
          console.error('Error normalizing location:', normalizeError);
        } else {
          finalLocation = normalizedLocationData || location.trim();
        }
      }

      // Build the forced, non-editable attribution line for this claim.
      // The display name lives in the users table (auth metadata is often empty),
      // so resolve it there and only append the email when we actually have a name.
      let claimerName = (user?.user_metadata?.name as string | undefined)?.trim() || '';
      if (!claimerName && user?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        claimerName = (profile?.name || '').trim();
      }
      const claimerEmail = user?.email || 'no email';
      const baseAttribution = claimerName
        ? `Tool claimed by ${claimerName} (${claimerEmail}) — responsibility acknowledged`
        : `Tool claimed by ${claimerEmail} — responsibility acknowledged`;
      // If the tech flagged any checklist items, summarize them on the
      // transaction so the damage shows up directly in the transaction log
      // (app + admin) under the acknowledgment line.
      const attribution = appendDamageSummary(baseAttribution);
      const overallNotes = notes.trim();

      // Resolve the *live* current owner from the DB rather than trusting the
      // tool snapshot we were navigated with. That snapshot can be stale (e.g.
      // the tool looked unassigned in the list when this screen opened), which
      // previously caused claims to log "From: System" even though another tech
      // actually held the tool. Reading it fresh keeps the From column correct.
      let liveFromOwner: string | null = tool.current_owner ?? null;
      {
        const { data: liveTool } = await supabase
          .from('tools')
          .select('current_owner')
          .eq('id', tool.id)
          .single();
        if (liveTool) {
          liveFromOwner = liveTool.current_owner ?? null;
        }
      }

      // Create the transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert({
          tool_id: tool.id,
          from_user_id: liveFromOwner,
          to_user_id: user?.id,
          location: finalLocation,
          stored_at: storedAt.trim(),
          notes: overallNotes,
          attribution,
          company_id: tool.company_id,
        })
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      // Create checklist reports for items that need attention.
      // If a flagged item has no comment of its own, fall back to the overall
      // transaction notes so the damage report isn't left blank.
      const reportsToInsert = checklistItems
        .filter(item => item.status !== 'ok')
        .map(item => ({
          transaction_id: transactionData.id,
          checklist_item_id: item.id,
          status: item.status === 'damaged' ? 'Damaged/Needs Repair' : 'Needs Replacement/Resupply',
          comments: item.comments?.trim() || overallNotes || '',
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

      // If the tech picked a tracker in the claim form, attach it now that they
      // own the tool. Best-effort: a claim shouldn't fail because of this.
      if (claimTrackerSerial && !toolTracker) {
        try {
          await attachTracker(claimTrackerSerial, tool.id, claimTrackerMount);
        } catch (e: any) {
          console.warn('Attach-on-claim failed:', e?.message || e);
          Alert.alert(
            'Tool claimed, but tracker not attached',
            e?.message || 'You can attach the tracker from the tool screen.'
          );
        }
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

  // Build a short, human summary of any flagged checklist items and append it
  // to a transaction's attribution line (newline-separated), e.g.:
  //   "Overall Tool Condition – Needs Repair; Hose – Needs Replacement reported"
  const appendDamageSummary = (base: string): string => {
    const flagged = checklistItems.filter(item => item.status !== 'ok');
    if (flagged.length === 0) return base;
    const parts = flagged.map(item =>
      `${item.item_name} – ${item.status === 'damaged' ? 'Needs Repair' : 'Needs Replacement'}`
    );
    return `${base}\n${parts.join('; ')} reported`;
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
      // Normalize the location using our SQL function (only when company_id is available)
      const originalLocation = latestTransaction?.location || 'Current Location';
      let finalLocation = originalLocation;
      if (tool.company_id) {
        const { data: normalizedLocationData, error: normalizeError } = await supabase
          .rpc('normalize_location', {
            p_company_id: tool.company_id,
            p_input_location: originalLocation
          });

        if (normalizeError) {
          console.error('Error normalizing location:', normalizeError);
        } else {
          finalLocation = normalizedLocationData || originalLocation;
        }
      }

      // Create a "self-transfer" to generate checklist report
      let reporterName = (user?.user_metadata?.name as string | undefined)?.trim() || '';
      if (!reporterName && user?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        reporterName = (profile?.name || '').trim();
      }
      const reporterEmail = user?.email || 'no email';
      const baseReportAttribution = reporterName
        ? `Checklist report submitted by ${reporterName} (${reporterEmail})`
        : `Checklist report submitted by ${reporterEmail}`;
      const reportAttribution = appendDamageSummary(baseReportAttribution);
      const { data: transactionData, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert({
          tool_id: tool.id,
          from_user_id: user?.id,
          to_user_id: user?.id,
          location: finalLocation,
          stored_at: latestTransaction?.stored_at || 'N/A',
          notes: '',
          attribution: reportAttribution,
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

    const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
    const prefetched = new Set<string>();

    const onViewableItemsChanged = ({ viewableItems }: { viewableItems: Array<{ index: number | null | undefined }> }) => {
      viewableItems.forEach(({ index }) => {
        if (index === null || index === undefined) return;
        // Prefetch next 1 image to make swiping instant (lighter on bandwidth)
        for (let offset = 0; offset <= 1; offset++) {
          const targetIdx = index + offset;
          if (targetIdx >= images.length) continue;
          const id = images[targetIdx].id;
          if (prefetched.has(id)) continue;
          prefetched.add(id);
          const u = images[targetIdx].thumb_url || resize(images[targetIdx].image_url, 400, 70);
          ExpoImage.prefetch?.(u);
        }
      });
    };

    return (
      <FlatList
        horizontal
        data={images}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.imageGallery}
        contentContainerStyle={styles.imageGalleryContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              setViewerIndex(index);
              setViewerVisible(true);
            }}
          >
            <ExpoImage
              source={{ uri: item.thumb_url || resize(item.image_url, 256, 60) }}
              style={styles.toolImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        )}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    );
  };

  // Prefetch first two gallery images once (lightweight)
  useEffect(() => {
    if (images.length === 0) return;
    images.slice(0, 2).forEach(img => {
      const u = img.thumb_url || resize(img.image_url, 400, 70);
      ExpoImage.prefetch?.(u);
    });
  }, [images]);

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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tool Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
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

        {/* GPS Tracker */}
        {trackersEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Tracker</Text>
          <View style={styles.statusCard}>
            {toolTracker ? (
              <>
                <View style={styles.statusRow}>
                  <View style={styles.statusIcon}>
                    <Ionicons name="hardware-chip-outline" size={20} color="#6b7280" />
                  </View>
                  <View style={styles.statusContent}>
                    <Text style={styles.statusLabel}>Tracker</Text>
                    <Text style={styles.statusValue}>
                      {trackerDisplayName(toolTracker)}
                      {'  '}
                      <Text
                        style={
                          toolTracker.mount_type === 'permanent'
                            ? styles.mountPermanent
                            : styles.mountTemporary
                        }
                      >
                        {toolTracker.mount_type === 'permanent' ? 'Permanent' : 'Temporary'}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.statusIcon}>
                    <Ionicons name="navigate-outline" size={20} color="#6b7280" />
                  </View>
                  <View style={styles.statusContent}>
                    <Text style={styles.statusLabel}>GPS Position</Text>
                    {!!(toolLocation?.recorded_at || toolLocation?.updated_at) ? (
                      <Text style={styles.locationMeta}>
                        Last fix {relativeTime((toolLocation!.recorded_at || toolLocation!.updated_at) as string)}
                        {'  ·  '}
                        {new Date(
                          (toolLocation!.recorded_at || toolLocation!.updated_at) as string
                        ).toLocaleString()}
                      </Text>
                    ) : (
                      <Text style={styles.statusValue}>No GPS fix yet</Text>
                    )}
                    {toolLocation?.battery != null && (
                      <Text style={styles.locationMeta}>
                        🔋 Battery {toolLocation.battery.toFixed(2)}V
                      </Text>
                    )}
                  </View>
                </View>

                {toolLocation?.latitude != null && toolLocation?.longitude != null && (
                  <View style={styles.mapWrap}>
                    <TrackerMap
                      latitude={toolLocation.latitude}
                      longitude={toolLocation.longitude}
                      thumbUrl={tool.photo_url}
                    />
                    <TouchableOpacity style={styles.directionsButton} onPress={openLocationInMaps}>
                      <Ionicons name="navigate" size={16} color="#2563eb" />
                      <Text style={styles.directionsText}>Get directions</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Temporary mounts can be detached here; permanent mounts are
                    physically affixed, so we intentionally show no detach UI. */}
                {isOwner && toolTracker.mount_type === 'temporary' && (
                  <TouchableOpacity
                    style={styles.detachButton}
                    onPress={handleDetachTracker}
                    disabled={trackerBusy}
                  >
                    <Ionicons name="unlink-outline" size={18} color="#dc2626" />
                    <Text style={styles.detachButtonText}>Detach tracker</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : isOwner ? (
              trackerPool.length > 0 ? (
                <View style={{ padding: 12 }}>
                  <Text style={styles.statusLabel}>Attach a tracker from your pool</Text>
                  <View style={styles.poolChips}>
                    {trackerPool.map((p) => (
                      <TouchableOpacity
                        key={p.serial}
                        style={styles.poolChip}
                        disabled={trackerBusy}
                        onPress={() =>
                          Alert.alert(
                            `Attach ${trackerDisplayName(p)}`,
                            'How is this tracker mounted to the tool?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Temporary (pooled)',
                                onPress: () => handleAttachTracker(p.serial, 'temporary'),
                              },
                              {
                                text: 'Permanent (affixed)',
                                onPress: () => handleAttachTracker(p.serial, 'permanent'),
                              },
                            ]
                          )
                        }
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#2563eb" />
                        <Text style={styles.poolChipText}>{trackerDisplayName(p)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={styles.statusValue}>No tracker attached</Text>
                  <Text style={styles.locationMeta}>
                    No trackers available in your company pool.
                  </Text>
                </View>
              )
            ) : (
              <View style={{ padding: 12 }}>
                <Text style={styles.statusValue}>No tracker attached</Text>
              </View>
            )}
          </View>
        </View>
        )}

        {/* Latest Transaction Notes */}
        {(latestTransaction?.notes || latestTransaction?.attribution) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Transaction Notes</Text>
            <View style={styles.notesCard}>
              {!!latestTransaction?.attribution && (
                <Text style={styles.attributionText}>{latestTransaction.attribution}</Text>
              )}
              {!!latestTransaction?.notes && (
                <Text style={styles.notesText}>{latestTransaction.notes}</Text>
              )}
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
      <View style={[styles.bottomSection, { paddingVertical: 8 }]}>
        {tool.current_owner !== user?.id ? (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={handleClaimOwnership}
          >
            <Ionicons name="hand-left-outline" size={20} color="#ffffff" />
            <Text style={styles.claimButtonText}>Start Tool Claim</Text>
          </TouchableOpacity>
        ) : (
          <>
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
            {/* Transfer removed: owners can submit checklist, transfers are disabled */}
          </>
        )}
      </View>

      {/* Claim Ownership Modal — fullScreen so it can't be swiped closed;
          the user must use Cancel. This also fixes scroll/drag conflicts. */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <SafeAreaView
              edges={['left', 'right', 'bottom']}
              style={[
                styles.modalContainer,
                isClaimFormValid ? styles.modalContainerValid : styles.modalContainerInitial,
              ]}
            >
              {/* In a fullScreen Modal the safe-area insets can report 0, which
                  left Cancel jammed against the status bar/clock. Add an explicit
                  top padding so the header always clears the top of the screen. */}
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
                <TouchableOpacity 
                  onPress={() => setClaimModalVisible(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Claim Tool Ownership</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
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

            {/* Attach a GPS tracker during claim (temporary or permanent).
                Only shown when nothing is already attached and the company has
                trackers available in its pool. */}
            {trackersEnabled && !toolTracker && trackerPool.length > 0 && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  GPS Tracker {trackerRequired ? '(required for this tool)' : '(optional)'}
                </Text>
                <View style={styles.poolChips}>
                  {trackerPool.map((p) => {
                    const selected = claimTrackerSerial === p.serial;
                    return (
                      <TouchableOpacity
                        key={p.serial}
                        style={[styles.poolChip, selected && styles.poolChipSelected]}
                        onPress={() =>
                          setClaimTrackerSerial(selected ? null : p.serial)
                        }
                      >
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={16}
                          color={selected ? '#16a34a' : '#2563eb'}
                        />
                        <Text style={styles.poolChipText}>{trackerDisplayName(p)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!!claimTrackerSerial && (
                  <View style={styles.mountToggleRow}>
                    {(['temporary', 'permanent'] as MountType[]).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.mountToggle,
                          claimTrackerMount === m && styles.mountToggleActive,
                        ]}
                        onPress={() => setClaimTrackerMount(m)}
                      >
                        <Text
                          style={[
                            styles.mountToggleText,
                            claimTrackerMount === m && styles.mountToggleTextActive,
                          ]}
                        >
                          {m === 'temporary' ? 'Temporary (pooled)' : 'Permanent (affixed)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

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
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            {/* Responsibility Acknowledgment */}
            <View style={styles.inputSection}>
              <TouchableOpacity
                style={[
                  styles.ackRow,
                  attemptedClaim && !acknowledged && styles.ackRowError,
                ]}
                onPress={() => {
                  setAcknowledged(prev => !prev);
                  setClaimErrors([]);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.ackCheckbox, acknowledged && styles.ackCheckboxChecked]}>
                  {acknowledged && (
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.ackText}>
                  By claiming this tool, I acknowledge that I am taking
                  responsibility for it and that it is now in my possession and
                  care.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stacked validation messages (grow on each failed tap) */}
            {claimErrors.length > 0 && (
              <View style={styles.claimErrorBox}>
                {claimErrors.map((msg, idx) => (
                  <Text key={idx} style={styles.claimErrorText}>{msg}</Text>
                ))}
              </View>
            )}

            {/* Claim Tool Button — always pressable so an invalid tap gives
                feedback instead of silently doing nothing. */}
            <View style={styles.bottomButtonSection}>
              <TouchableOpacity
                onPress={handleClaimSubmit}
                disabled={claiming}
                style={[
                  styles.claimButton,
                  isClaimFormValid
                    ? styles.finishClaimButtonEnabled
                    : styles.finishClaimButtonDisabled,
                ]}
              >
                <Ionicons name="hand-left-outline" size={20} color="#ffffff" />
                <Text style={styles.claimButtonText}>
                  {claiming ? 'Claiming...' : 'Finish Tool Claim'}
                </Text>
              </TouchableOpacity>
            </View>
              </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
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

      {/* Full-screen image viewer */}
      <ImageViewing
        images={images.map(img => ({ uri: img.image_url }))}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />

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
    padding: 4, // further reduced padding
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // even tighter row spacing
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusIcon: {
    width: 24, // even smaller icon column
    alignItems: 'center',
    marginRight: 8, // reduced spacing
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
  attributionText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 6,
  },
  mountTemporary: {
    fontSize: 13,
    color: '#b45309',
    fontWeight: '600',
  },
  mountPermanent: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
  locationLink: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  mapWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  directionsText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  locationMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  detachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  detachButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
  poolChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  poolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  poolChipText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  poolChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  mountToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  mountToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  mountToggleActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  mountToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  mountToggleTextActive: {
    color: '#2563eb',
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 14,
  },
  ackCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#ffffff',
  },
  ackCheckboxChecked: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  ackRowError: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  claimErrorBox: {
    paddingHorizontal: 16,
  },
  claimErrorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  ackText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#7c2d12',
    lineHeight: 21,
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
  // ----- Claim-flow enhancements -----
  finishClaimButtonEnabled: {
    backgroundColor: '#22c55e', // green when ready
  },
  finishClaimButtonDisabled: {
    backgroundColor: '#d1d5db', // light grey by default / disabled
  },
  modalContainerInitial: {
    backgroundColor: '#fef9c3', // light yellow until required filled
  },
  modalContainerValid: {
    backgroundColor: '#ecfdf5', // light green once valid
  },
  inputInvalid: {
    backgroundColor: '#fee2e2', // light red highlight
    borderColor: '#fca5a5',
  },
  inputValid: {
    backgroundColor: '#d1fae5', // light green highlight
    borderColor: '#6ee7b7',
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
    color: '#1f2937', // ensure text is visible across themes
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
    color: '#1f2937', // ensure text is visible across themes
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