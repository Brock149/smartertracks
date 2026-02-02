import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AllToolsScreen from '../screens/AllToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';
import MultiTransferToolsScreen from '../screens/MultiTransferToolsScreen';

type AllToolsStackParamList = {
  AllToolsList: undefined;
  ToolDetail: { tool: any };
  TransferMultiple: { groupId?: string } | undefined;
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
      <Stack.Screen name="TransferMultiple" component={MultiTransferToolsScreen} />
    </Stack.Navigator>
  );
} 