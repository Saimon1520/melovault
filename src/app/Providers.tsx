import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { palette } from '@/design-system/tokens/colors';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    TrackPlayerService.getInstance()
      .setup()
      .then(() => setReady(true))
      .catch((err) => {
        // Player already set up (hot reload) — safe to continue
        if (String(err).includes('already')) setReady(true);
        else console.error('[TrackPlayer] setup error:', err);
      });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {ready ? children : (
          <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={palette.accent} size="large" />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
