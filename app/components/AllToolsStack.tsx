import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AllToolsScreen from '../screens/AllToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';

type AllToolsStackParamList = {
  AllToolsList: undefined;
  ToolDetail: { tool: any };
};

const Stack = createStackNavigator<AllToolsStackParamList>();

export default function AllToolsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AllToolsList" component={AllToolsScreen} />
      <Stack.Screen name="ToolDetail" component={ToolDetailScreen} />
    </Stack.Navigator>
  );
} 