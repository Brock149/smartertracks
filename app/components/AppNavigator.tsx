import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MyToolsStack from './MyToolsStack';
import AllToolsStack from './AllToolsStack';
import AccountScreen from '../screens/AccountScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'MyTools') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'AllTools') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5 + insets.bottom,
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="MyTools" 
        component={MyToolsStack} 
        options={{
          tabBarLabel: 'My Tools',
        }}
      />
      <Tab.Screen 
        name="AllTools" 
        component={AllToolsStack} 
        options={{
          tabBarLabel: 'All Tools',
        }}
      />
      
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
} 