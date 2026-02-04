import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import MultiTransferToolsScreen from '../screens/MultiTransferToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';

type GroupsStackParamList = {
  GroupsList: undefined;
  GroupDetail: { groupId: string };
  TransferMultiple: { groupId?: string } | undefined;
  ToolDetail: { tool: any };
};

const Stack = createStackNavigator<GroupsStackParamList>();

export default function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="ToolDetail" component={ToolDetailScreen} />
      <Stack.Screen name="TransferMultiple" component={MultiTransferToolsScreen} />
    </Stack.Navigator>
  );
}
