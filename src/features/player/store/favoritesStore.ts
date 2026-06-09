import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Favorite (liked) songs, persisted in AsyncStorage so the heart state survives
 * app restarts without a DB schema change.
 */
interface FavoritesStore {
  favoriteIds: string[];
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (songId: string) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      isFavorite: (songId) => get().favoriteIds.includes(songId),
      toggleFavorite: (songId) =>
        set((s) =>
          s.favoriteIds.includes(songId)
            ? { favoriteIds: s.favoriteIds.filter((id) => id !== songId) }
            : { favoriteIds: [...s.favoriteIds, songId] },
        ),
    }),
    {
      name: '@melovault/favorites',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
