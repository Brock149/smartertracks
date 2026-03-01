import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { openAppStore } from '../utils/versionCheck';

interface ForceUpdateScreenProps {
  currentVersion: string;
  minimumVersion: string;
  message?: string;
  storeUrl?: string;
}

export default function ForceUpdateScreen({
  currentVersion,
  minimumVersion,
  message,
  storeUrl,
}: ForceUpdateScreenProps) {
  const defaultMessage =
    'A new version of SmarterTracks is available! Please update to continue using the app.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Update Required</Text>
        
        <Text style={styles.message}>{message || defaultMessage}</Text>

        <View style={styles.versionInfo}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Current Version:</Text>
            <Text style={styles.versionValue}>{currentVersion}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Required Version:</Text>
            <Text style={styles.versionValue}>{minimumVersion}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => openAppStore(storeUrl)}
          activeOpacity={0.8}
        >
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          You'll be redirected to the App Store to download the latest version.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  versionInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  versionLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
