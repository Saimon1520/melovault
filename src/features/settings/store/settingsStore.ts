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

  // When on, the player does NOT yield audio focus, so music keeps playing over
  // calls/meetings (Meet, Zoom…) instead of pausing. Read at player setup.
  playDuringMeetings: boolean;

  // What to do when another app briefly takes audio (e.g. a notification):
  // 'pause' fully pauses & resumes (default); 'duck' just lowers the volume.
  interruptionMode: 'pause' | 'duck';

  // Show the small explanatory bubbles above the shuffle/repeat controls when
  // they're toggled (what "repeat one" vs "repeat all" do, etc.).
  showControlHints: boolean;

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
  setPlayDuringMeetings: (enabled: boolean) => void;
  setInterruptionMode: (mode: 'pause' | 'duck') => void;
  setShowControlHints: (show: boolean) => void;
  setPersistEqualizer: (enabled: boolean) => void;
  setEqualizerState: (state: { enabled: boolean; preset: string; gains: number[] }) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'system',
      seekSeconds: 10,
      crossfadeMs: 0,
      defaultSpeed: 1.0,
      gaplessPlayback: true,
      showAlbumArtBackground: true,
      playDuringMeetings: false,
      interruptionMode: 'pause',
      showControlHints: true,
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
      setPlayDuringMeetings: (playDuringMeetings) => set({ playDuringMeetings }),
      setInterruptionMode: (interruptionMode) => set({ interruptionMode }),
      setShowControlHints: (showControlHints) => set({ showControlHints }),
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
