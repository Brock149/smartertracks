import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to SASI Tool Tracker</Text>
          <Text style={styles.subtitle}>You're logged in as:</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Tools (Coming Soon)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Transactions (Coming Soon)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Checklists (Coming Soon)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
  },
  buttonContainer: {
    gap: 16,
  },
  featureButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  featureButtonText: {
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 18,
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 32,
  },
  signOutButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
}); 