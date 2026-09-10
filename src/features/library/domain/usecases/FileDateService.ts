import { NativeModules, Platform } from 'react-native';
import { useFileDateStore } from '@/features/library/store/fileDateStore';
import type { Song } from '@/shared/types';

interface NativeFileDate {
  dateAdded?: number;    // epoch ms
  dateModified?: number; // epoch ms
}

const AudioMetadata: {
  getFileDatesByPaths?(paths: string[]): Promise<Record<string, NativeFileDate>>;
} | undefined = NativeModules.AudioMetadata;

// MediaStore's DATA column holds bare paths; MeloVault rows can carry a
// `file://` URI. Normalize both ends so the lookup matches.
function normalizePath(path: string): string {
  if (!path.startsWith('file://')) return path;
  const bare = path.slice('file://'.length);
  try {
    return decodeURIComponent(bare);
  } catch {
    return bare;
  }
}

/**
 * Fills in the real device download date (MediaStore DATE_ADDED) for any song
 * that doesn't have one cached yet.
 *
 * Cheap to call repeatedly: songs already dated — and songs MediaStore had no
 * date for — are skipped, so after the first pass this does nothing at all.
 * Returns true when at least one new date was learned, so the caller can
 * re-render a date-sorted list.
 */
export async function backfillFileDates(songs: Song[]): Promise<boolean> {
  if (Platform.OS !== 'android' || !AudioMetadata?.getFileDatesByPaths) return false;

  const { dates, missingIds, mergeDates } = useFileDateStore.getState();
  const missing = new Set(missingIds);
  const pending = songs.filter(s => dates[s.id] == null && !missing.has(s.id) && !!s.filePath);
  if (pending.length === 0) return false;

  // path -> songId. Several rows could share a path in theory; last one wins,
  // which is fine since they'd resolve to the same file date anyway.
  const byPath = new Map<string, string>();
  for (const song of pending) byPath.set(normalizePath(song.filePath), song.id);

  const learned: Record<string, number> = {};
  // Only songs from a chunk that actually came back count as "checked" — a
  // chunk that threw must stay retryable, or a transient failure would blacklist
  // those songs forever.
  const checked: string[] = [];
  const paths = [...byPath.keys()];
  // Matches the chunking the native side uses for its IN (...) queries.
  const CHUNK = 400;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const slice = paths.slice(i, i + CHUNK);
    try {
      const part = await AudioMetadata.getFileDatesByPaths(slice);
      for (const [path, value] of Object.entries(part)) {
        const songId = byPath.get(normalizePath(path));
        // DATE_ADDED is the download; DATE_MODIFIED is the usable stand-in when
        // the media store never recorded one.
        const stamp = value?.dateAdded ?? value?.dateModified;
        if (songId && typeof stamp === 'number' && stamp > 0) learned[songId] = stamp;
      }
      for (const path of slice) {
        const songId = byPath.get(path);
        if (songId) checked.push(songId);
      }
    } catch {
      // A failed chunk just leaves those songs on the scan-date fallback.
    }
  }

  mergeDates(learned, checked);
  return Object.keys(learned).length > 0;
}
