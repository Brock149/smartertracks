import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  created_at: string;
}

export default function AccountScreen() {
  const { user, signOut, refreshCompany } = useAuth();
  const navigation = useNavigation<any>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasCompany = !!userProfile?.company_id;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      // Get user profile with company information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role,
          company_id,
          created_at,
          company:companies!users_company_id_fkey(
            id,
            name,
            is_active,
            created_at
          )
        `)
        .eq('id', user?.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        Alert.alert('Error', 'Failed to load profile information');
        return;
      }

      setUserProfile(userData);
      setCompany(userData.company);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeleteVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password required', 'Please enter your password to confirm.');
      return;
    }
    if (!userProfile?.email) {
      Alert.alert('Error', 'Could not verify your account. Please try again.');
      return;
    }
    setDeleting(true);
    try {
      // Re-authenticate to confirm it's really them before erasing everything.
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: deletePassword,
      });
      if (pwError) {
        setDeleting(false);
        Alert.alert('Incorrect password', 'That password is incorrect. Please try again.');
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        setDeleting(false);
        Alert.alert('Error', error.message || 'Failed to delete account');
        return;
      }
      setDeleting(false);
      setDeleteVisible(false);
      Alert.alert('Account Deleted', 'Your account has been deleted.');
      signOut();
    } catch (err: any) {
      setDeleting(false);
      Alert.alert('Error', err.message || 'Failed to delete account');
    }
  };

  const handleLeaveCompany = () => {
    Alert.alert(
      'Leave company?',
      'You will lose access to this company\'s tools and info. Your account stays active and your personal tools — photos, history, everything — stay with you. Any company tools you currently hold will stay logged under your name, marked "(removed)".',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave company',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              const { data, error } = await supabase.functions.invoke('leave-company');
              if (error || !data?.success) {
                Alert.alert('Could not leave', (error?.message as string) || data?.error || 'Please try again.');
                setLeaving(false);
                return;
              }
              setLeaving(false);
              Alert.alert('Left company', 'You are no longer part of this company.');
              fetchUserProfile();
              refreshCompany();
            } catch (err: any) {
              setLeaving(false);
              Alert.alert('Error', err.message || 'Failed to leave company.');
            }
          },
        },
      ]
    );
  };

  const handleJoinCompany = async () => {
    const code = joinCode.trim();
    if (!code) {
      Alert.alert('Code required', 'Enter the access code your new company gave you.');
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-company-with-code', {
        body: { accessCode: code },
      });
      if (error || !data?.success) {
        Alert.alert('Could not join', (error?.message as string) || data?.error || 'Invalid access code.');
        setJoining(false);
        return;
      }
      setJoinCode('');
      setJoining(false);
      Alert.alert('Joined', 'You are now part of your new company.');
      fetchUserProfile();
      refreshCompany();
    } catch (err: any) {
      setJoining(false);
      Alert.alert('Error', err.message || 'Failed to join company.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.title}>Account</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Ionicons name="log-out-outline" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#6b7280" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userProfile?.name}</Text>
              <Text style={styles.userRole}>{userProfile?.role?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{userProfile?.name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userProfile?.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{userProfile?.role}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.created_at ? formatDate(userProfile.created_at) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          {hasCompany ? (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="business-outline" size={20} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Company Name</Text>
                    <Text style={styles.infoValue}>{company?.name || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Company Since</Text>
                    <Text style={styles.infoValue}>
                      {company?.created_at ? formatDate(company.created_at) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Self-serve: leave the company (in case the employer forgets to
                  remove you and you want to join a new one). */}
              <TouchableOpacity
                style={[styles.leaveButton, leaving && styles.joinButtonDisabled]}
                onPress={handleLeaveCompany}
                disabled={leaving}
              >
                {leaving ? (
                  <ActivityIndicator color="#b45309" />
                ) : (
                  <>
                    <Ionicons name="exit-outline" size={20} color="#b45309" />
                    <Text style={styles.leaveButtonText}>Leave company</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.joinCard}>
              <View style={styles.joinHeaderRow}>
                <Ionicons name="business-outline" size={22} color="#7c3aed" />
                <Text style={styles.joinTitle}>You're not part of a company</Text>
              </View>
              <Text style={styles.joinSubtitle}>
                You won't see any company tools, transfers, or groups until you join one. Your
                personal tools stay with you — photos, lending history, everything — so when you join
                a new company your whole inventory comes with you for a frictionless transition to
                getting covered under your new employer or union agreement. Enter the access code your
                employer gave you to join.
              </Text>
              <TextInput
                style={styles.joinInput}
                placeholder="Enter company access code"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!joining}
              />
              <TouchableOpacity
                style={[styles.joinButton, joining && styles.joinButtonDisabled]}
                onPress={handleJoinCompany}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.joinButtonText}>Join Company</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="phone-portrait-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>App Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="construct-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>SASI Tool Tracker</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out & Delete Account Buttons */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutCard} onPress={handleSignOut}>
            <View style={styles.signOutContent}>
              <Ionicons name="log-out-outline" size={24} color="#dc2626" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#dc2626" />
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity style={styles.deleteCard} onPress={handleDeleteAccount}>
            <View style={styles.signOutContent}>
              <Ionicons name="trash-outline" size={24} color="#b91c1c" />
              <Text style={styles.deleteText}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#b91c1c" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete account confirmation (password required) */}
      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your account and your personal tool inventory. This cannot be
              undone. Enter your password to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Your password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDelete, deleting && styles.joinButtonDisabled]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  signOutButton: {
    padding: 8,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingVertical: 14,
  },
  leaveButtonText: {
    color: '#b45309',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  signOutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 12,
  },
  deleteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    color: '#b91c1c',
    fontWeight: '600',
    marginLeft: 12,
  },
  joinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  joinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  joinTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  joinSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  joinInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDelete: {
    backgroundColor: '#b91c1c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 130,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 