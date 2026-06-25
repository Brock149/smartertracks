import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface NoCompanyBannerProps {
  // Short label describing what's hidden, e.g. "company tools" or "groups".
  feature?: string;
}

// Shown on company-only screens when the signed-in tech isn't part of a company.
// Explains that their personal tools stay with them and offers a Join button
// that jumps to the Account screen where the access-code form lives.
export default function NoCompanyBanner({ feature = 'company tools' }: NoCompanyBannerProps) {
  const navigation = useNavigation<any>();

  const goToJoin = () => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Account');
    } else {
      navigation.navigate('Account');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="business-outline" size={28} color="#7c3aed" />
      </View>
      <Text style={styles.title}>You're not part of a company</Text>
      <Text style={styles.body}>
        You won't see any {feature} until you join one. Your personal tools — photos, lending
        history, everything — stay with you, so when you join a company your whole inventory comes
        with you.
      </Text>
      <TouchableOpacity style={styles.button} onPress={goToJoin} activeOpacity={0.8}>
        <Ionicons name="enter-outline" size={20} color="#ffffff" />
        <Text style={styles.buttonText}>Join a company</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
