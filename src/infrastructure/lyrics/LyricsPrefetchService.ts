import AsyncStorage from '@react-native-async-storage/async-storage';
import { LRCLibService } from './LRCLibService';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { useArchiveStore } from '@/features/library/store/archiveStore';

// Remember which songs we've already tried so we don't keep hammering LRCLib for
// tracks it doesn't have. (A song with saved synced lyrics is skipped anyway.)
const ATTEMPTED_KEY = '@melovault/lyrics-attempted';
const STEP_DELAY_MS = 350; // be polite to the public LRCLib API

let running = false;

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Background, throttled bulk lyrics download. Run after a scan so the user gets
 * lyrics (ideally synced/karaoke) for their whole library automatically instead
 * of fetching one song at a time. Idempotent and resumable — safe to call again
 * on new scans; it only touches songs without synced lyrics that we haven't
 * tried yet. Fire-and-forget: never throws, never blocks the UI.
 */
export async function prefetchLyrics(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const songRepo = new SongRepository();
    const songs = await songRepo.getAll('title');

    let attempted: Set<string>;
    try {
      const raw = await AsyncStorage.getItem(ATTEMPTED_KEY);
      attempted = new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      attempted = new Set<string>();
    }

    const isArchived = useArchiveStore.getState().isArchived;

    let sinceSave = 0;
    for (const song of songs) {
      if (song.lyricsSynced) continue;      // already have karaoke lyrics
      if (attempted.has(song.id)) continue; // already tried (found plain or nothing)
      if (isArchived(song)) continue;       // notification tones / voice notes — no lyrics

      try {
        const result = await LRCLibService.searchLyrics(
          song.title,
          song.artist,
          song.album,
          song.duration ? song.duration / 1000 : undefined, // stored ms → seconds
        );
        if (result?.syncedLyrics) {
          await songRepo.updateLyrics(song.id, result.plainLyrics ?? '', result.syncedLyrics);
        } else if (result?.plainLyrics) {
          await songRepo.updateLyrics(song.id, result.plainLyrics);
        }
      } catch {
        // ignore network/parse errors — try again on a future run only if we
        // don't mark it; but to avoid endless retries we mark it attempted below
      }

      attempted.add(song.id);
      if (++sinceSave >= 5) {
        sinceSave = 0;
        try { await AsyncStorage.setItem(ATTEMPTED_KEY, JSON.stringify([...attempted])); } catch {}
      }
      await delay(STEP_DELAY_MS);
    }

    try { await AsyncStorage.setItem(ATTEMPTED_KEY, JSON.stringify([...attempted])); } catch {}
  } catch {
    // never surface — purely best-effort
  } finally {
    running = false;
  }
}
