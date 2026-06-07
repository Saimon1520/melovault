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

  setTheme: (theme: Theme) => void;
  setSeekSeconds: (seconds: number) => void;
  setCrossfadeMs: (ms: number) => void;
  setDefaultSpeed: (speed: PlaybackSpeed) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  setShowAlbumArtBackground: (show: boolean) => void;
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

      setTheme: (theme) => set({ theme }),
      setSeekSeconds: (seekSeconds) => set({ seekSeconds }),
      setCrossfadeMs: (crossfadeMs) => set({ crossfadeMs }),
      setDefaultSpeed: (defaultSpeed) => set({ defaultSpeed }),
      setGaplessPlayback: (gaplessPlayback) => set({ gaplessPlayback }),
      setShowAlbumArtBackground: (showAlbumArtBackground) => set({ showAlbumArtBackground }),
    }),
    {
      name: '@melovault/settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
