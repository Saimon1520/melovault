import React, { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import type { BottomTabParamList } from './types';
import { palette } from '@/design-system/tokens/colors';
import { MiniPlayer } from '@/features/player/presentation/components/MiniPlayer';
import { NowPlayingScreen } from '@/features/player/presentation/screens/NowPlayingScreen';
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
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const activeTrack = useActiveTrack();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0 }}>
      {/* Now Playing modal overlay */}
      {nowPlayingOpen && (
        <View style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <NowPlayingScreen onClose={() => setNowPlayingOpen(false)} />
        </View>
      )}

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
          },
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textMuted,
          tabBarStyle: {
            backgroundColor: palette.surface1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            borderTopWidth: 1,
            paddingBottom: 4,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Library" component={LibraryPlaceholder} options={{ title: 'Biblioteca' }} />
        <Tab.Screen name="Playlists" component={PlaylistsPlaceholder} options={{ title: 'Playlists' }} />
        <Tab.Screen name="Settings" component={SettingsPlaceholder} options={{ title: 'Ajustes' }} />
      </Tab.Navigator>

      {/* Mini player sits above the tab bar when a song is loaded */}
      {activeTrack && !nowPlayingOpen && (
        <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 50 }}>
          <MiniPlayer onExpand={() => setNowPlayingOpen(true)} />
        </View>
      )}
    </View>
  );
}
