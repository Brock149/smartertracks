import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyToolsScreen from '../screens/MyToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';
import AddPersonalToolScreen from '../screens/AddPersonalToolScreen';
import PersonalToolDetailScreen from '../screens/PersonalToolDetailScreen';
import { useAuth } from '../context/AuthContext';

type MyToolsStackParamList = {
  MyToolsList: undefined;
  ToolDetail: { tool: any };
  AddPersonalTool: undefined;
  PersonalToolDetail: { toolId: string };
};

const Stack = createStackNavigator<MyToolsStackParamList>();

export default function MyToolsStack() {
  const { features } = useAuth();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MyToolsList" component={MyToolsScreen} />
      <Stack.Screen name="ToolDetail" component={ToolDetailScreen} />
      {/* Personal tool screens are only registered when the company has the
          personal tools feature enabled, so they can't be reached otherwise. */}
      {features.personalToolsEnabled && (
        <>
          <Stack.Screen name="AddPersonalTool" component={AddPersonalToolScreen} />
          <Stack.Screen name="PersonalToolDetail" component={PersonalToolDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
