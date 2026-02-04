import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import MyToolsStack from './MyToolsStack';
import AllToolsStack from './AllToolsStack';
import AccountScreen from '../screens/AccountScreen';
import HomeStack from './HomeStack';
import GroupsStack from './GroupsStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyTools') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'AllTools') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'albums' : 'albums-outline';
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
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
        }}
      />
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
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('AllTools', { screen: 'AllToolsList' })
          },
        })}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsStack} 
        options={{
          tabBarLabel: 'Groups',
        }}
      />
      
    </Tab.Navigator>
  );
} 

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Account" component={AccountScreen} />
    </Stack.Navigator>
  );
}