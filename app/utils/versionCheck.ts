import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export interface VersionCheckResult {
  needsUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  minimumVersion: string;
  latestVersion: string;
  updateMessage?: string;
  storeUrl?: string;
}

/**
 * Compares two semantic version strings (e.g., "1.2.3" and "1.2.5")
 * Returns:
 *  - negative if v1 < v2
 *  - 0 if v1 === v2
 *  - positive if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 !== num2) {
      return num1 - num2;
    }
  }
  
  return 0;
}

/**
 * Checks if the current app version meets the minimum requirement
 * @returns VersionCheckResult with update information
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  try {
    // Get current app version - use native version for production builds, expo version for dev
    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    
    // Fetch version requirements from database
    const { data, error } = await supabase
      .from('app_version_control')
      .select('*')
      .eq('platform', platform)
      .single();
    
    if (error) {
      console.error('Error fetching version control:', error);
      // If we can't fetch version info, allow user to continue
      return {
        needsUpdate: false,
        forceUpdate: false,
        currentVersion,
        minimumVersion: currentVersion,
        latestVersion: currentVersion,
      };
    }
    
    const minimumVersion = data.minimum_version;
    const latestVersion = data.current_version;
    const forceUpdateEnabled = data.force_update_enabled;
    
    // Compare current version with minimum required version
    const isOutdated = compareVersions(currentVersion, minimumVersion) < 0;
    const isNotLatest = compareVersions(currentVersion, latestVersion) < 0;
    
    return {
      needsUpdate: isNotLatest,
      forceUpdate: isOutdated && forceUpdateEnabled,
      currentVersion,
      minimumVersion,
      latestVersion,
      updateMessage: data.update_message,
      storeUrl: data.store_url,
    };
  } catch (error) {
    console.error('Error in checkAppVersion:', error);
    // On error, allow user to continue
    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
    return {
      needsUpdate: false,
      forceUpdate: false,
      currentVersion,
      minimumVersion: currentVersion,
      latestVersion: currentVersion,
    };
  }
}

/**
 * Opens the app store to the app's page
 * @param storeUrl Custom store URL, or will use default based on platform
 */
export function openAppStore(storeUrl?: string) {
  const { Linking } = require('react-native');
  
  let url = storeUrl;
  
  if (!url) {
    if (Platform.OS === 'ios') {
      url = 'https://apps.apple.com/us/app/smarter-tracks/id6748660773';
    } else {
      url = 'https://play.google.com/store/apps/details?id=com.bactech.smartertracks&pcampaignid=web_share';
    }
  }
  
  Linking.openURL(url).catch((err: Error) => {
    console.error('Error opening store:', err);
  });
}
