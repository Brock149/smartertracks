import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import {
  createPersonalTool,
  uploadPersonalToolImage,
  MAX_PERSONAL_PHOTOS,
} from '../services/personalTools';

export default function AddPersonalToolScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const canAddMore = photos.length < MAX_PERSONAL_PHOTOS;
  const isValid = name.trim().length > 0;

  const addFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, MAX_PERSONAL_PHOTOS));
    }
  };

  const addFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Please allow photo library access in Settings to add a photo.');
      return;
    }
    const remaining = MAX_PERSONAL_PHOTOS - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, MAX_PERSONAL_PHOTOS));
    }
  };

  const handleAddPhoto = () => {
    if (!canAddMore) {
      Alert.alert('Photo limit', `You can add up to ${MAX_PERSONAL_PHOTOS} photos per tool.`);
      return;
    }
    Alert.alert('Add Photo', 'Tip: include a photo showing the brand label and any serial number.', [
      { text: 'Take Photo', onPress: addFromCamera },
      { text: 'Choose from Library', onPress: addFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => {
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!isValid) {
      Alert.alert('Name required', 'Please enter a tool name.');
      return;
    }
    setSaving(true);
    try {
      setProgress('Creating tool...');
      const tool = await createPersonalTool(user.id, name);

      for (let i = 0; i < photos.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
        await uploadPersonalToolImage(tool.id, user.id, photos[i], i === 0);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving personal tool:', error);
      Alert.alert('Error', 'Could not save the tool. Please try again.');
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Add Personal Tool</Text>
          <Text style={styles.subtitle}>Your own tool inventory</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Tool name</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`e.g. "Klein lineman's pliers"`}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              Photos ({photos.length}/{MAX_PERSONAL_PHOTOS})
            </Text>
            <Text style={styles.tip}>
              Tip: include a photo showing the brand label and any serial number.
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoWrapper}>
                  <ExpoImage source={{ uri }} style={styles.photo} contentFit="cover" />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(uri)} disabled={saving}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {canAddMore && (
                <TouchableOpacity style={styles.addPhoto} onPress={handleAddPhoto} disabled={saving}>
                  <Ionicons name="camera-outline" size={28} color="#2563eb" />
                  <Text style={styles.addPhotoText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.saveButtonText}>{progress || 'Saving...'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Add to My Tools</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },
  inputSection: { marginTop: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  tip: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoWrapper: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#e5e7eb' },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  addPhotoText: { color: '#2563eb', fontSize: 13, fontWeight: '600', marginTop: 4 },
  bottomSection: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: { backgroundColor: '#9ca3af' },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
