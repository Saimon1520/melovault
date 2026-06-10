import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-song manual sync offset (ms) for synced lyrics. Online LRC files are timed
 * for one specific recording; a user's file can have a different intro length or
 * be a different version, so a constant offset is needed to line the karaoke up.
 * Positive = show each line later; negative = earlier.
 */
interface LyricsOffsetStore {
  offsets: Record<string, number>;
  getOffset: (songId?: string) => number;
  setOffset: (songId: string, ms: number) => void;
}

export const useLyricsOffsetStore = create<LyricsOffsetStore>()(
  persist(
    (set, get) => ({
      offsets: {},
      getOffset: (songId) => (songId ? get().offsets[songId] ?? 0 : 0),
      setOffset: (songId, ms) =>
        set((s) => ({ offsets: { ...s.offsets, [songId]: ms } })),
    }),
    {
      name: '@melovault/lyrics-offset',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
