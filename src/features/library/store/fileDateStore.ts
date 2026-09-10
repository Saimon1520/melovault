import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '@/shared/types';

/**
 * When each song's FILE landed on the device — MediaStore's DATE_ADDED, i.e. the
 * download date — keyed by song id.
 *
 * Deliberately NOT `song.createdAt`: WatermelonDB owns `created_at` as a
 * @readonly field and stamps it with the moment MeloVault's scan first saw the
 * file, which for an existing library is "the day you installed the app" for
 * every single song. Useless for "recently added".
 *
 * Kept in AsyncStorage rather than a new DB column because the bridge adapter
 * no-ops addColumns migrations on this setup (see the schema.ts data-loss
 * warning) — same pattern as the archive / favorites / position-memory stores.
 */
interface FileDateStore {
  /** songId -> download date (epoch ms). */
  dates: Record<string, number>;
  /** Songs we already asked about and MediaStore had no date for — don't retry. */
  missingIds: string[];
  mergeDates: (entries: Record<string, number>, checkedIds: string[]) => void;
  /** Forget a song's date (it was deleted from the device). */
  forget: (songId: string) => void;
}

export const useFileDateStore = create<FileDateStore>()(
  persist(
    (set) => ({
      dates: {},
      missingIds: [],
      mergeDates: (entries, checkedIds) =>
        set((s) => {
          const dates = { ...s.dates, ...entries };
          // Anything we just asked about that still has no date is a dead end;
          // remember it so the backfill doesn't re-query it on every load.
          const stillMissing = checkedIds.filter(id => dates[id] == null);
          return {
            dates,
            missingIds: [...new Set([...s.missingIds, ...stillMissing])].filter(
              id => dates[id] == null,
            ),
          };
        }),
      forget: (songId) =>
        set((s) => {
          const { [songId]: _dropped, ...dates } = s.dates;
          return { dates, missingIds: s.missingIds.filter(id => id !== songId) };
        }),
    }),
    {
      name: '@melovault/file-dates',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * The song's download date, falling back to MeloVault's own scan date so sorting
 * and filtering never have to deal with `undefined`.
 */
export function downloadedAt(song: Song): number {
  return useFileDateStore.getState().dates[song.id] ?? song.createdAt;
}

/** True when the date is the real device one, not the scan-date fallback. */
export function hasRealDownloadDate(songId: string): boolean {
  return useFileDateStore.getState().dates[songId] != null;
}
