import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import TransferToolsScreen from '../screens/TransferToolsScreen';
import MultiTransferToolsScreen from '../screens/MultiTransferToolsScreen';

type HomeStackParamList = {
  HomeMain: undefined;
  TransferTools: { selectedTool?: any } | undefined;
  TransferMultiple: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="TransferTools" component={TransferToolsScreen} />
      <Stack.Screen name="TransferMultiple" component={MultiTransferToolsScreen} />
    </Stack.Navigator>
  );
}
