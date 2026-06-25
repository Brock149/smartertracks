import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import ImageView from 'react-native-image-viewing';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import {
  PersonalTool,
  PersonalToolImage,
  PersonalToolTransaction,
  fetchPersonalTool,
  uploadPersonalToolImage,
  deletePersonalToolImage,
  updatePersonalToolName,
  deletePersonalTool,
  lendPersonalTool,
  returnPersonalTool,
  MAX_PERSONAL_PHOTOS,
} from '../services/personalTools';
import { resize } from '../utils';

interface CompanyUser {
  id: string;
  name: string;
  role: string;
  email: string;
}

export default function PersonalToolDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const { user } = useAuth();
  const toolId: string = route.params?.toolId;

  const [tool, setTool] = useState<PersonalTool | null>(null);
  const [transactions, setTransactions] = useState<PersonalToolTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [editNameVisible, setEditNameVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [lendVisible, setLendVisible] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [lendLocation, setLendLocation] = useState('');
  const [lendNotes, setLendNotes] = useState('');
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);

  const load = useCallback(async () => {
    const result = await fetchPersonalTool(toolId);
    if (result) {
      setTool(result.tool);
      setTransactions(result.transactions);
    }
    setLoading(false);
  }, [toolId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    // Load the tech's company users so the lend recipient box can double as a
    // search (just like admins searching users on a transfer).
    (async () => {
      if (!user?.id) return;
      const { data: me } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      if (!me?.company_id) return;
      const { data } = await supabase
        .from('users')
        .select('id, name, role, email')
        .eq('company_id', me.company_id)
        .neq('id', user.id)
        .order('name');
      setCompanyUsers((data || []) as CompanyUser[]);
    })();
  }, [user?.id]);

  const images: PersonalToolImage[] = tool?.images || [];
  const canAddMore = images.length < MAX_PERSONAL_PHOTOS;

  // Suggestions only show while typing a free-text name. Once a coworker is
  // picked (recipientUserId set), we hide the list and just keep their name in
  // the box. This search only helps autocomplete the name — it has no other
  // effect (the coworker isn't notified and receives nothing).
  const recipientMatches = (recipient.trim().length > 0 && !recipientUserId)
    ? companyUsers.filter(u => {
        const term = recipient.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
        );
      })
    : [];

  const handleAddPhoto = () => {
    if (!canAddMore) {
      Alert.alert('Photo limit', `You can add up to ${MAX_PERSONAL_PHOTOS} photos per tool.`);
      return;
    }
    Alert.alert('Add Photo', 'Tip: include a photo showing the brand label and any serial number.', [
      { text: 'Take Photo', onPress: () => pickAndUpload('camera') },
      { text: 'Choose from Library', onPress: () => pickAndUpload('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickAndUpload = async (source: 'camera' | 'library') => {
    if (!user?.id || !tool) return;
    try {
      let uris: string[] = [];
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
        if (result.canceled || !result.assets?.length) return;
        uris = [result.assets[0].uri];
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo access needed', 'Please allow photo library access in Settings.');
          return;
        }
        const remaining = MAX_PERSONAL_PHOTOS - images.length;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 1,
        });
        if (result.canceled || !result.assets?.length) return;
        uris = result.assets.map(a => a.uri);
      }

      setBusy(true);
      for (let i = 0; i < uris.length; i++) {
        const makePrimary = images.length === 0 && i === 0;
        await uploadPersonalToolImage(tool.id, user.id, uris[i], makePrimary);
      }
      await load();
    } catch (e) {
      console.error('Error uploading photo:', e);
      Alert.alert('Error', 'Could not upload the photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePhoto = (image: PersonalToolImage) => {
    Alert.alert('Delete photo?', 'This photo will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deletePersonalToolImage(image);
            await load();
          } catch (e) {
            Alert.alert('Error', 'Could not delete the photo.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (!nameDraft.trim()) return;
    try {
      setBusy(true);
      await updatePersonalToolName(toolId, nameDraft);
      setEditNameVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Could not update the name.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTool = () => {
    Alert.alert(
      'Delete tool?',
      'This permanently deletes the tool, its photos, and its history. This cannot be undone.',
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deletePersonalTool(toolId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Could not delete the tool.');
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openLend = () => {
    setRecipient('');
    setRecipientUserId(null);
    setRecipientEmail('');
    setLendLocation('');
    setLendNotes('');
    setLendVisible(true);
  };

  const handleLendSubmit = async () => {
    if (!user?.id || !recipient.trim()) {
      Alert.alert('Recipient required', 'Enter who you are lending this tool to.');
      return;
    }
    try {
      setBusy(true);
      await lendPersonalTool(toolId, user.id, {
        toName: recipient,
        toEmail: recipientEmail,
        toUserId: recipientUserId,
        location: lendLocation,
        notes: lendNotes,
      });
      setLendVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Could not record the loan.');
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = () => {
    Alert.alert('Mark as returned?', 'This tool will show as back in your possession.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Returned',
        onPress: async () => {
          if (!user?.id) return;
          try {
            setBusy(true);
            await returnPersonalTool(toolId, user.id);
            await load();
          } catch (e) {
            Alert.alert('Error', 'Could not update the tool.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!tool) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loading}>
          <Text style={styles.emptyText}>Tool not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLent = tool.holder_type === 'lent';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>{tool.name}</Text>
          <Text style={styles.subtitle}>Personal tool #{tool.number}</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={() => { setNameDraft(tool.name); setEditNameVisible(true); }}>
          <Ionicons name="create-outline" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.muted}>{images.length}/{MAX_PERSONAL_PHOTOS}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {images.map((img, idx) => (
              <TouchableOpacity
                key={img.id}
                onPress={() => { setViewerIndex(idx); setViewerVisible(true); }}
                onLongPress={() => handleDeletePhoto(img)}
              >
                <ExpoImage
                  source={{ uri: img.thumb_url || resize(img.image_url, 300, 70) }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                {img.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Main</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {canAddMore && (
              <TouchableOpacity style={styles.addPhoto} onPress={handleAddPhoto} disabled={busy}>
                <Ionicons name="camera-outline" size={28} color="#2563eb" />
                <Text style={styles.addPhotoText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          {images.length > 0 && (
            <Text style={styles.hint}>Tap a photo to view. Long-press to delete.</Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <DetailRow label="Owner" value="You (personal tool)" />
            <DetailRow label="Added" value={new Date(tool.created_at).toLocaleDateString()} />
            <View style={styles.divider} />
            <View style={styles.statusRow}>
              <Ionicons
                name={isLent ? 'arrow-redo-outline' : 'checkmark-circle'}
                size={20}
                color={isLent ? '#d97706' : '#059669'}
              />
              <Text style={[styles.statusText, { color: isLent ? '#b45309' : '#047857' }]}>
                {isLent ? `Lent to ${tool.lent_to_name}` : 'In your possession'}
              </Text>
            </View>
            {isLent && !!tool.lent_to_email && (
              <Text style={styles.lentMeta}>Email: {tool.lent_to_email}</Text>
            )}
            {isLent && !!tool.lent_location && (
              <Text style={styles.lentMeta}>Location: {tool.lent_location}</Text>
            )}
            {isLent && !!tool.lent_at && (
              <Text style={styles.lentMeta}>Since: {new Date(tool.lent_at).toLocaleDateString()}</Text>
            )}
          </View>

          {isLent ? (
            <TouchableOpacity style={[styles.actionButton, styles.returnButton]} onPress={handleReturn} disabled={busy}>
              <Ionicons name="arrow-undo-outline" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Mark as Returned</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.lendButton]} onPress={openLend} disabled={busy}>
              <Ionicons name="arrow-redo-outline" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Lend This Tool</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.muted}>No history yet.</Text>
          ) : (
            <View style={styles.card}>
              {transactions.map((tx, i) => (
                <View key={tx.id} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                  <Ionicons
                    name={
                      tx.action === 'lent' ? 'arrow-redo' : tx.action === 'returned' ? 'arrow-undo' : 'add-circle'
                    }
                    size={18}
                    color="#6b7280"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyText}>
                      {tx.action === 'lent' && `Lent to ${tx.to_name}`}
                      {tx.action === 'returned' && 'Marked returned'}
                      {tx.action === 'created' && 'Added to inventory'}
                    </Text>
                    {tx.action === 'lent' && !!tx.to_email && (
                      <Text style={styles.historyMeta}>Email: {tx.to_email}</Text>
                    )}
                    {!!tx.location && <Text style={styles.historyMeta}>Location: {tx.location}</Text>}
                    {!!tx.notes && <Text style={styles.historyMeta}>{tx.notes}</Text>}
                    <Text style={styles.historyDate}>{new Date(tx.timestamp).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Delete */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTool} disabled={busy}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Delete Tool</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}

      <ImageView
        images={images.map(img => ({ uri: img.image_url }))}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />

      {/* Edit name modal */}
      <Modal visible={editNameVisible} transparent animationType="fade" onRequestClose={() => setEditNameVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit tool name</Text>
            <TextInput
              style={styles.textInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditNameVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveName} disabled={!nameDraft.trim()}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lend modal */}
      <Modal visible={lendVisible} transparent animationType="slide" onRequestClose={() => setLendVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Lend tool</Text>
            <Text style={styles.inputLabel}>Lend to</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Type a name (or search a coworker)"
              value={recipient}
              onChangeText={(t) => { setRecipient(t); setRecipientUserId(null); setRecipientEmail(''); }}
              autoCapitalize="words"
            />
            {recipientMatches.length > 0 && (
              <View style={styles.suggestionBox}>
                <FlatList
                  data={recipientMatches.slice(0, 5)}
                  keyExtractor={(u) => u.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionRow}
                      onPress={() => { setRecipient(item.name); setRecipientUserId(item.id); setRecipientEmail(item.email || ''); }}
                    >
                      <Ionicons name="person-circle-outline" size={20} color="#6b7280" />
                      <Text style={styles.suggestionText}>{item.name} ({item.email})</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            <Text style={styles.inputLabel}>Email (so you can contact them)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="name@example.com"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>Location (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Job site, Kevin's truck"
              value={lendLocation}
              onChangeText={setLendLocation}
            />
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Anything to remember"
              value={lendNotes}
              onChangeText={setLendNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLendVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleLendSubmit} disabled={!recipient.trim()}>
                <Text style={styles.modalConfirmText}>Lend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  link: { color: '#2563eb', fontWeight: '600' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { marginRight: 12, padding: 4 },
  headerContent: { flex: 1 },
  headerIcon: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  content: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  muted: { fontSize: 14, color: '#9ca3af' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 8, fontStyle: 'italic' },
  photo: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#e5e7eb' },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(37,99,235,0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  addPhoto: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  addPhotoText: { color: '#2563eb', fontSize: 13, fontWeight: '600', marginTop: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 15, color: '#6b7280' },
  detailValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 16, fontWeight: '700' },
  lentMeta: { fontSize: 14, color: '#6b7280', marginTop: 4, marginLeft: 28 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 12,
  },
  lendButton: { backgroundColor: '#2563eb' },
  returnButton: { backgroundColor: '#059669' },
  actionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  historyDivider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  historyText: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  historyMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  historyDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 180,
    backgroundColor: '#ffffff',
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionText: { fontSize: 15, color: '#1f2937' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  modalConfirm: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalConfirmText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
