import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, NativeModules, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { restoreLastSession, startPositionPersistence, savePositionNow } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
import { prefetchLyrics } from '@/infrastructure/lyrics/LyricsPrefetchService';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { OnboardingScreen } from '@/features/onboarding/presentation/screens/OnboardingScreen';
import { useTheme } from '@/design-system/useTheme';

const ONBOARDING_KEY = '@melovault/onboarding_complete';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const palette = useTheme();
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'ready'>('loading');

  useEffect(() => {
    const init = async () => {
      try {
        // Setup TrackPlayer
        await TrackPlayerService.getInstance()
          .setup()
          .catch((err) => {
            if (!String(err).includes('already')) throw err;
          });

        // Re-apply a remembered equalizer (opt-in). AudioEffects holds the
        // gains until the ExoPlayer audio session is ready, then applies them.
        const settings = useSettingsStore.getState();
        if (settings.persistEqualizer && settings.equalizerEnabled) {
          const AudioControl = NativeModules.AudioControl;
          AudioControl?.setGains?.(settings.equalizerGains.map((g) => Math.round(g * 100)));
          AudioControl?.setEqEnabled?.(true);
        }

        // Check if onboarding was completed
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!onboardingDone) {
          setAppState('onboarding');
          return;
        }

        // Restore last session
        await restoreLastSession();
        startPositionPersistence();
        setAppState('ready');

        // Resume the background lyrics download for any songs still missing them
        // (e.g. if a previous run was interrupted). Delayed + best-effort.
        setTimeout(() => { prefetchLyrics(); }, 8000);
      } catch (err) {
        console.error('[Providers] init error:', err);
        setAppState('ready');
      }
    };

    init();
  }, []);

  // Save the exact playback position the moment the app leaves the foreground
  // (home, app switch, swipe-close) so a song with position memory reopens
  // precisely where it was, not at the last periodic checkpoint.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        savePositionNow(true);
      } else if (next === 'active') {
        // Back to the foreground: if the player was cleared while we were away
        // (the notification "stop" button reset()s the queue), reload the saved
        // session (song or persistence-playlist, at its saved position) so it's
        // there to resume. No-op when a track is already loaded.
        restoreLastSession();
      }
    });
    return () => sub.remove();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await restoreLastSession();
    startPositionPersistence();
    setAppState('ready');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {appState === 'loading' && (
          <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={palette.accent} size="large" />
          </View>
        )}
        {appState === 'onboarding' && (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        )}
        {appState === 'ready' && children}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
