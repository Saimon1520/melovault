import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { palette, lightPalette, type ThemeColors } from './tokens/colors';

/**
 * The effective color scheme: the user's explicit choice, or — when set to
 * 'system' (the default) — whatever the phone's OS theme is.
 */
export function useEffectiveScheme(): 'light' | 'dark' {
  const theme = useSettingsStore(s => s.theme);
  const system = useColorScheme();
  if (theme === 'light' || theme === 'dark') return theme;
  return system === 'light' ? 'light' : 'dark';
}

/**
 * Returns the active color palette (light or dark). Components call this and
 * keep using the same `palette.X` keys, so they re-render and re-color whenever
 * the user toggles the theme or the system theme changes.
 */
export function useTheme(): ThemeColors {
  return useEffectiveScheme() === 'light' ? lightPalette : palette;
}
