import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function SuspendedOverlay() {
  const { refreshSuspended } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleReload = async () => {
    try {
      setChecking(true);
      await refreshSuspended();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={64} color="#dc2626" />
      <Text style={styles.title}>Account Suspended</Text>
      <Text style={styles.msg}>Please contact billing to reactivate your company.</Text>

      <TouchableOpacity
        style={styles.reloadBtn}
        onPress={handleReload}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.reloadText}>Check Again</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#b91c1c',
    marginTop: 12,
  },
  msg: {
    fontSize: 16,
    color: '#7f1d1d',
    marginTop: 8,
    textAlign: 'center',
  },
  reloadBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  reloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 