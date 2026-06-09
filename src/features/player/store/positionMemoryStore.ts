import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-song opt-in for resuming where you left off. Stored separately from the
 * WatermelonDB row (in AsyncStorage) so it survives app restarts without a
 * schema migration. The actual saved position lives in `song.lastPosition`.
 */
interface PositionMemoryStore {
  rememberIds: string[];
  isRemembered: (songId: string) => boolean;
  setRemembered: (songId: string, remember: boolean) => void;
}

export const usePositionMemoryStore = create<PositionMemoryStore>()(
  persist(
    (set, get) => ({
      rememberIds: [],
      isRemembered: (songId) => get().rememberIds.includes(songId),
      setRemembered: (songId, remember) =>
        set((s) => {
          const has = s.rememberIds.includes(songId);
          if (remember && !has) return { rememberIds: [...s.rememberIds, songId] };
          if (!remember && has) return { rememberIds: s.rememberIds.filter((id) => id !== songId) };
          return s;
        }),
    }),
    {
      name: '@melovault/position-memory',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
