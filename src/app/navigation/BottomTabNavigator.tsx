import React, { useState, useEffect, useRef } from 'react';
import { View, BackHandler, ToastAndroid, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import type { BottomTabParamList } from './types';
import { palette } from '@/design-system/tokens/colors';
import { MiniPlayer } from '@/features/player/presentation/components/MiniPlayer';
import { NowPlayingScreen } from '@/features/player/presentation/screens/NowPlayingScreen';
import { LibraryPlaceholder } from '@/features/library/presentation/screens/LibraryPlaceholder';
import { PlaylistsPlaceholder } from '@/features/playlists/presentation/screens/PlaylistsPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/presentation/screens/SettingsPlaceholder';
import { SearchScreen } from '@/features/search/presentation/screens/SearchScreen';
import { QueueScreen } from '@/features/queue/presentation/screens/QueueScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Library: { active: 'musical-notes', inactive: 'musical-notes-outline' },
  Playlists: { active: 'list', inactive: 'list-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export function BottomTabNavigator() {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | undefined>();
  const activeTrack = useActiveTrack();
  const insets = useSafeAreaInsets();
  const lastBackRef = useRef(0);

  // Hardware back: close the queue/now-playing overlays first; from the library
  // require a double press to actually leave the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (queueOpen) { setQueueOpen(false); return true; }
      if (nowPlayingOpen) { setNowPlayingOpen(false); return true; }
      const now = Date.now();
      if (now - lastBackRef.current < 2000) return false; // exit the app
      lastBackRef.current = now;
      ToastAndroid.show('Presiona atrás otra vez para salir', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [nowPlayingOpen, queueOpen]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0 }}>
      {/* Now Playing full screen overlay */}
      {nowPlayingOpen && (
        <View style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <NowPlayingScreen
            onClose={() => setNowPlayingOpen(false)}
            songId={activeSongId}
          />
        </View>
      )}

      {/* Queue modal */}
      <QueueScreen visible={queueOpen} onClose={() => setQueueOpen(false)} />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name] ?? TAB_ICONS.Library!;
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
        <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Buscar' }} />
        <Tab.Screen name="Settings" component={SettingsPlaceholder} options={{ title: 'Ajustes' }} />
      </Tab.Navigator>

      {/* Mini player sits just above the tab bar (which is ~49pt tall + the
          bottom safe-area inset) so it never overlaps the navigation buttons */}
      {activeTrack && !nowPlayingOpen && (
        <View style={{ position: 'absolute', bottom: 53 + insets.bottom, left: insets.left, right: insets.right, zIndex: 50 }}>
          <MiniPlayer
            onExpand={() => {
              setActiveSongId(activeTrack.id ? String(activeTrack.id) : undefined);
              setNowPlayingOpen(true);
            }}
            onQueueOpen={() => setQueueOpen(true)}
          />
        </View>
      )}
    </View>
  );
}
