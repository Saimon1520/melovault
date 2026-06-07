import { palette, lightPalette } from './tokens/colors';
import { space, radius } from './tokens/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from './tokens/typography';
import { duration, easing } from './tokens/animations';

export const darkTheme = {
  colors: palette,
  space,
  radius,
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
  duration,
  easing,
  shadows: {
    artwork: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.6,
      shadowRadius: 30,
      elevation: 20,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    miniPlayer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

export const lightTheme = {
  ...darkTheme,
  colors: { ...palette, ...lightPalette },
} as const;

export type Theme = typeof darkTheme;
