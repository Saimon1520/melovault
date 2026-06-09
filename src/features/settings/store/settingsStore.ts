import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaybackSpeed } from '@/shared/types';

type Theme = 'dark' | 'light' | 'system';

interface SettingsStore {
  theme: Theme;
  seekSeconds: number;
  crossfadeMs: number;
  defaultSpeed: PlaybackSpeed;
  gaplessPlayback: boolean;
  showAlbumArtBackground: boolean;

  // Equalizer persistence (opt-in). When on, the EQ enable state + band gains
  // are remembered and re-applied across app restarts.
  persistEqualizer: boolean;
  equalizerEnabled: boolean;
  equalizerPreset: string;
  equalizerGains: number[]; // per-band gain in dB

  setTheme: (theme: Theme) => void;
  setSeekSeconds: (seconds: number) => void;
  setCrossfadeMs: (ms: number) => void;
  setDefaultSpeed: (speed: PlaybackSpeed) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  setShowAlbumArtBackground: (show: boolean) => void;
  setPersistEqualizer: (enabled: boolean) => void;
  setEqualizerState: (state: { enabled: boolean; preset: string; gains: number[] }) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      seekSeconds: 10,
      crossfadeMs: 0,
      defaultSpeed: 1.0,
      gaplessPlayback: true,
      showAlbumArtBackground: true,
      persistEqualizer: false,
      equalizerEnabled: false,
      equalizerPreset: 'flat',
      equalizerGains: [0, 0, 0, 0, 0],

      setTheme: (theme) => set({ theme }),
      setSeekSeconds: (seekSeconds) => set({ seekSeconds }),
      setCrossfadeMs: (crossfadeMs) => set({ crossfadeMs }),
      setDefaultSpeed: (defaultSpeed) => set({ defaultSpeed }),
      setGaplessPlayback: (gaplessPlayback) => set({ gaplessPlayback }),
      setShowAlbumArtBackground: (showAlbumArtBackground) => set({ showAlbumArtBackground }),
      setPersistEqualizer: (persistEqualizer) => set({ persistEqualizer }),
      setEqualizerState: ({ enabled, preset, gains }) =>
        set({ equalizerEnabled: enabled, equalizerPreset: preset, equalizerGains: gains }),
    }),
    {
      name: '@melovault/settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
