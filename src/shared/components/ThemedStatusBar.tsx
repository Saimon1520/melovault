import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme, useEffectiveScheme } from '@/design-system/useTheme';

/**
 * StatusBar whose icon/text color follows the active theme — light icons on the
 * dark theme, dark icons on the light theme — with a matching background.
 */
export function ThemedStatusBar() {
  const scheme = useEffectiveScheme();
  const palette = useTheme();
  return (
    <StatusBar
      barStyle={scheme === 'light' ? 'dark-content' : 'light-content'}
      backgroundColor={palette.surface0}
    />
  );
}
