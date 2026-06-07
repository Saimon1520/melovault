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

export const lightPalette = {
  surface0: '#F2F2F7',
  surface1: '#FFFFFF',
  surface2: '#F8F8FC',
  surface3: '#EDEDF5',
  textPrimary: '#0E0E16',
  textSecondary: '#58586A',
  textMuted: '#A0A0B8',
} as const;

export type DynamicColors = {
  dominant: string;
  vibrant: string;
  muted: string;
  onDominant: string;
};
