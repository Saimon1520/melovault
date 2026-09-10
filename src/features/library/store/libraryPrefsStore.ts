import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SortMode, DateFilter } from '@/features/library/domain/downloadDate';

/**
 * How the user likes their library listed — remembered across launches.
 *
 * Picking "Descarga más reciente" once means the library opens that way every
 * time from then on, until they choose something else. Same for the download
 * date window and for the "Recién agregadas" screen's own range.
 */
interface LibraryPrefsStore {
  /** Song-list ordering. */
  sortMode: SortMode;
  /** Download-date window applied to the song list. */
  dateFilter: DateFilter;
  /** Range shown by the "Recién agregadas" screen (kept separate on purpose:
   *  narrowing that list shouldn't narrow the whole library). */
  recentFilter: DateFilter;

  setSortMode: (mode: SortMode) => void;
  setDateFilter: (filter: DateFilter) => void;
  setRecentFilter: (filter: DateFilter) => void;
}

export const useLibraryPrefsStore = create<LibraryPrefsStore>()(
  persist(
    (set) => ({
      sortMode: 'title',
      dateFilter: 'all',
      // "Cualquier fecha" rather than a fixed window: a window that happens to
      // hold nothing would open the screen empty, which reads as broken.
      recentFilter: 'all',

      setSortMode: (sortMode) => set({ sortMode }),
      setDateFilter: (dateFilter) => set({ dateFilter }),
      setRecentFilter: (recentFilter) => set({ recentFilter }),
    }),
    {
      name: '@melovault/library-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
