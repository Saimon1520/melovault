import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={BottomTabNavigator} />
        {/* Modal screens — registered but implemented in later phases */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
