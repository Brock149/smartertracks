import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import AppNavigator from './components/AppNavigator';
import SuspendedOverlay from './components/SuspendedOverlay';
import ForceUpdateScreen from './screens/ForceUpdateScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkAppVersion, VersionCheckResult } from './utils/versionCheck';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user, loading, suspended } = useAuth();
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(true);

  useEffect(() => {
    const performVersionCheck = async () => {
      try {
        const result = await checkAppVersion();
        setVersionCheck(result);
      } catch (error) {
        console.error('Version check failed:', error);
      } finally {
        setCheckingVersion(false);
      }
    };

    performVersionCheck();
  }, []);

  if (loading || checkingVersion) return null;

  // Force update takes precedence over everything else
  if (versionCheck?.forceUpdate) {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <ForceUpdateScreen
          currentVersion={versionCheck.currentVersion}
          minimumVersion={versionCheck.minimumVersion}
          message={versionCheck.updateMessage}
          storeUrl={versionCheck.storeUrl}
        />
      </NavigationContainer>
    );
  }

  if (user && suspended) {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <SuspendedOverlay />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {user ? <AppNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
