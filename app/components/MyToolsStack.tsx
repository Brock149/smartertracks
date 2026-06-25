import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyToolsScreen from '../screens/MyToolsScreen';
import ToolDetailScreen from '../screens/ToolDetailScreen';
import AddPersonalToolScreen from '../screens/AddPersonalToolScreen';
import PersonalToolDetailScreen from '../screens/PersonalToolDetailScreen';

type MyToolsStackParamList = {
  MyToolsList: undefined;
  ToolDetail: { tool: any };
  AddPersonalTool: undefined;
  PersonalToolDetail: { toolId: string };
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
      <Stack.Screen name="AddPersonalTool" component={AddPersonalToolScreen} />
      <Stack.Screen name="PersonalToolDetail" component={PersonalToolDetailScreen} />
    </Stack.Navigator>
  );
}
