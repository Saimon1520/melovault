import { useFileDateStore } from '@/features/library/store/fileDateStore';
import type { Song } from '@/shared/types';

/** How the song list is ordered. 'recent'/'oldest' use the device download date. */
export type SortMode = 'title' | 'artist' | 'recent' | 'oldest';

/** Rolling window filter on the download date. */
export type DateFilter = 'all' | '7d' | '30d' | '90d' | '365d';

export const SORT_OPTIONS: { value: SortMode; label: string; sublabel?: string }[] = [
  { value: 'title', label: 'Título (A-Z)' },
  { value: 'artist', label: 'Artista (A-Z)' },
  { value: 'recent', label: 'Descarga más reciente', sublabel: 'Lo último que bajaste primero' },
  { value: 'oldest', label: 'Descarga más antigua', sublabel: 'Lo más viejo primero' },
];

/** Chip text — the sheet labels are too long to fit two chips on a phone row. */
export const SORT_CHIP_LABEL: Record<SortMode, string> = {
  title: 'Título',
  artist: 'Artista',
  recent: 'Más recientes',
  oldest: 'Más antiguas',
};

export const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '365d', label: 'Último año' },
];

const WINDOW_MS: Record<Exclude<DateFilter, 'all'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '365d': 365 * 24 * 60 * 60 * 1000,
};

/**
 * When the file landed on the device, from the cached MediaStore DATE_ADDED.
 * Falls back to MeloVault's own scan date only for songs the media store had no
 * date for, so a list is never left with holes.
 *
 * Takes the dates map explicitly so React components can pass the subscribed
 * value and re-render when the backfill learns new dates.
 */
export function getDownloadDate(song: Song, dates: Record<string, number>): number {
  return dates[song.id] ?? song.createdAt;
}

/** Drops songs downloaded outside the selected window. 'all' is a pass-through. */
export function filterByDownloadDate(
  songs: Song[], filter: DateFilter, dates: Record<string, number>,
): Song[] {
  if (filter === 'all') return songs;
  const cutoff = Date.now() - WINDOW_MS[filter];
  return songs.filter(s => getDownloadDate(s, dates) >= cutoff);
}

/** Newest-first (or oldest-first) by download date. Returns a new array. */
export function sortByDownloadDate(
  songs: Song[], direction: 'recent' | 'oldest', dates: Record<string, number>,
): Song[] {
  const sign = direction === 'recent' ? -1 : 1;
  return [...songs].sort(
    (a, b) => sign * (getDownloadDate(a, dates) - getDownloadDate(b, dates)),
  );
}

/**
 * Short, human date for a list row: "hoy", "ayer", "hace 5 días", then an actual
 * date once it's old enough that a relative label stops being useful.
 */
export function formatDownloadDate(timestamp: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '';
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return new Date(timestamp).toLocaleDateString('es', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Hook-friendly accessor for the reactive dates map. */
export function useDownloadDates(): Record<string, number> {
  return useFileDateStore(s => s.dates);
}
