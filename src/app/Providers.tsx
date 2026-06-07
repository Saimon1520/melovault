import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { restoreLastSession, startPositionPersistence } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
import { OnboardingScreen } from '@/features/onboarding/presentation/screens/OnboardingScreen';
import { palette } from '@/design-system/tokens/colors';

const ONBOARDING_KEY = '@melovault/onboarding_complete';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
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
      } catch (err) {
        console.error('[Providers] init error:', err);
        setAppState('ready');
      }
    };

    init();
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
