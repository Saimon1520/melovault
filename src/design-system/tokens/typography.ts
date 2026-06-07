import { Platform } from 'react-native';

export const fontFamily = {
  sans: Platform.select({ ios: 'SF Pro Display', android: 'Roboto', default: 'System' }),
  mono: Platform.select({ ios: 'SF Mono', android: 'Roboto Mono', default: 'monospace' }),
} as const;

export const fontSize = {
  '2xs': 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const lineHeight = {
  tight: 1.2,
  base: 1.4,
  relaxed: 1.6,
} as const;
