import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabParamList } from './types';
import { palette } from '@/design-system/tokens/colors';

// Placeholder screens — replaced in Phase 2
import { LibraryPlaceholder } from '@/features/library/presentation/screens/LibraryPlaceholder';
import { PlaylistsPlaceholder } from '@/features/playlists/presentation/screens/PlaylistsPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/presentation/screens/SettingsPlaceholder';

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof BottomTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Library: { active: 'musical-notes', inactive: 'musical-notes-outline' },
  Playlists: { active: 'list', inactive: 'list-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface1,
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Library" component={LibraryPlaceholder} options={{ title: 'Biblioteca' }} />
      <Tab.Screen name="Playlists" component={PlaylistsPlaceholder} options={{ title: 'Playlists' }} />
      <Tab.Screen name="Settings" component={SettingsPlaceholder} options={{ title: 'Ajustes' }} />
    </Tab.Navigator>
  );
}
