import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyToolsScreen from '../screens/MyToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';

type MyToolsStackParamList = {
  MyToolsList: undefined;
  ToolDetail: { tool: any };
};

const Stack = createStackNavigator<MyToolsStackParamList>();

export default function MyToolsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MyToolsList" component={MyToolsScreen} />
      <Stack.Screen name="ToolDetail" component={ToolDetailScreen} />
    </Stack.Navigator>
  );
} 