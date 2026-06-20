export const palette = {
  black: '#080810',
  surface0: '#0E0E16',
  surface1: '#14141F',
  surface2: '#1C1C28',
  surface3: '#242432',
  textPrimary: '#F2F2F7',
  textSecondary: '#A0A0B8',
  textMuted: '#58586A',
  textInverted: '#0E0E16',
  accent: '#7C5CFC',
  accentDim: '#4A3899',
  accentSoft: 'rgba(124, 92, 252, 0.15)',
  success: '#00C9A7',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#64B5F6',
  persistenceActive: '#00C9A7',
  persistenceInactive: '#58586A',
  overlay10: 'rgba(0, 0, 0, 0.10)',
  overlay30: 'rgba(0, 0, 0, 0.30)',
  overlay60: 'rgba(0, 0, 0, 0.60)',
  overlay80: 'rgba(0, 0, 0, 0.80)',
  glass10: 'rgba(255, 255, 255, 0.05)',
  glass20: 'rgba(255, 255, 255, 0.10)',
  glassAccent: 'rgba(124, 92, 252, 0.12)',
} as const;

// A theme is the same set of keys as `palette`, with plain string values (the
// dark `palette` is `as const`, so we widen the literals here).
export type ThemeColors = { -readonly [K in keyof typeof palette]: string };

// Light theme — every key mirrors `palette` (the dark theme) so a component can
// swap the whole object via useTheme() and keep using the same `palette.X` keys.
export const lightPalette: ThemeColors = {
  black: '#FFFFFF',
  surface0: '#F2F2F7',
  surface1: '#FFFFFF',
  surface2: '#ECECF3',
  surface3: '#E0E0EA',
  textPrimary: '#0E0E16',
  textSecondary: '#55556A',
  textMuted: '#8A8A9C',
  textInverted: '#FFFFFF',
  accent: '#6A47F5',
  accentDim: '#B7A6FF',
  accentSoft: 'rgba(124, 92, 252, 0.14)',
  success: '#00A98F',
  warning: '#C77800',
  error: '#E5484D',
  info: '#2F7BE5',
  persistenceActive: '#00A98F',
  persistenceInactive: '#8A8A9C',
  // Scrims over modals/artwork stay dark in both themes.
  overlay10: 'rgba(0, 0, 0, 0.06)',
  overlay30: 'rgba(0, 0, 0, 0.18)',
  overlay60: 'rgba(0, 0, 0, 0.45)',
  overlay80: 'rgba(0, 0, 0, 0.60)',
  // "Glass" tints are dark-on-light here (the dark theme uses white-on-dark).
  glass10: 'rgba(0, 0, 0, 0.04)',
  glass20: 'rgba(0, 0, 0, 0.08)',
  glassAccent: 'rgba(124, 92, 252, 0.10)',
};

export type DynamicColors = {
  dominant: string;
  vibrant: string;
  muted: string;
  onDominant: string;
};
