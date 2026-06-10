const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const CLIENT_HEADER = 'MeloVault/1.0.0 (https://github.com/saimonvargas/melovault)';

export interface LRCLibTrack {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null; // LRC format
}

const UNKNOWN = /^(unknown|desconocido|artista desconocido|<unknown>|n\/a)?$/i;

// Strip the noise that download / YouTube filenames add, which wrecks matching:
// "(Official Video)", "[Lyrics]", "feat. X", "- Remix", bitrate tags, etc.
function cleanTitle(raw: string): string {
  return (raw || '')
    .replace(/\([^)]*\b(official|video|audio|lyric|lyrics|visualizer|hd|hq|4k|mv|live|remaster\w*)\b[^)]*\)/gi, '')
    .replace(/\[[^\]]*\b(official|video|audio|lyric|lyrics|visualizer|hd|hq|4k|mv|live)\b[^\]]*\]/gi, '')
    .replace(/\b(feat|ft|featuring)\.?\s+[^-([]+/gi, '')
    .replace(/\((?:feat|ft|featuring)\.?[^)]*\)/gi, '')
    .replace(/[-–|]\s*(official|video|audio|lyrics?).*/gi, '')
    .replace(/\s*[\[(][^\])]*[\])]\s*$/g, ' ') // trailing brackets
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanArtist(raw: string): string {
  if (!raw || UNKNOWN.test(raw.trim())) return '';
  return raw
    .replace(/\b(feat|ft|featuring)\.?\s+.*/gi, '')
    .replace(/\s*[,&].*$/g, '') // keep the primary artist
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function lrcGet(params: URLSearchParams): Promise<LRCLibTrack | null> {
  try {
    const res = await fetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`, {
      headers: { 'Lrclib-Client': CLIENT_HEADER },
    });
    if (!res.ok) return null;
    const t = (await res.json()) as LRCLibTrack;
    return t && (t.syncedLyrics || t.plainLyrics) ? t : null;
  } catch {
    return null;
  }
}

async function lrcSearch(query: string): Promise<LRCLibTrack[]> {
  try {
    const res = await fetch(`${LRCLIB_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Lrclib-Client': CLIENT_HEADER },
    });
    if (!res.ok) return [];
    const arr = (await res.json()) as LRCLibTrack[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Best candidate: has lyrics, prefer synced, then the closest duration.
function pickBest(cands: LRCLibTrack[], durationSeconds?: number): LRCLibTrack | null {
  const withLyrics = cands.filter(c => c.syncedLyrics || c.plainLyrics);
  if (withLyrics.length === 0) return null;
  withLyrics.sort((a, b) => {
    const synced = Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics);
    if (synced !== 0) return synced;
    if (durationSeconds) {
      return Math.abs(a.duration - durationSeconds) - Math.abs(b.duration - durationSeconds);
    }
    return 0;
  });
  return withLyrics[0] ?? null;
}

export class LRCLibService {
  /**
   * Multi-step lookup to maximise the chance of finding real (ideally synced)
   * lyrics without the user pasting them:
   *   1. exact /get with cleaned metadata + duration
   *   2. /get without duration
   *   3. fuzzy /search ("title artist", then just "title")
   */
  static async searchLyrics(
    title: string,
    artist: string,
    album?: string,
    durationSeconds?: number,
  ): Promise<LRCLibTrack | null> {
    let t = cleanTitle(title);
    let a = cleanArtist(artist);

    // YouTube-style "Artist - Title" when the artist tag is missing.
    if (!a && title.includes(' - ')) {
      const [maybeArtist, ...rest] = title.split(' - ');
      if (rest.length) {
        a = cleanArtist(maybeArtist ?? '');
        t = cleanTitle(rest.join(' - '));
      }
    }
    if (!t) t = (title || '').trim();

    // Prefer SYNCED lyrics (for karaoke); fall back to plain.
    let plainFallback: LRCLibTrack | null = null;

    // 1) exact match (most accurate)
    if (a) {
      const p1 = new URLSearchParams({ track_name: t, artist_name: a });
      if (album) p1.set('album_name', album);
      if (durationSeconds) p1.set('duration', String(Math.round(durationSeconds)));
      const exact = (await lrcGet(p1)) ?? (await lrcGet(new URLSearchParams({ track_name: t, artist_name: a })));
      if (exact?.syncedLyrics) return exact;
      if (exact) plainFallback = exact;
    }

    // 2) fuzzy full-text search — look for a synced version first
    const queries = [a ? `${t} ${a}` : t, t].filter((q, i, arr) => q && arr.indexOf(q) === i);
    for (const q of queries) {
      const cands = await lrcSearch(q);
      const synced = pickBest(cands.filter(c => c.syncedLyrics), durationSeconds);
      if (synced) return synced;
      if (!plainFallback) plainFallback = pickBest(cands, durationSeconds);
    }

    return plainFallback;
  }

  static parseLRC(lrc: string): Array<{ timeMs: number; text: string }> {
    const lines: Array<{ timeMs: number; text: string }> = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    for (const line of lrc.split('\n')) {
      let match: RegExpExecArray | null;

      // eslint-disable-next-line no-cond-assign
      while ((match = timeRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1] ?? '0', 10);
        const seconds = parseInt(match[2] ?? '0', 10);
        const ms = parseInt((match[3] ?? '0').padEnd(3, '0'), 10);
        const timeMs = (minutes * 60 + seconds) * 1000 + ms;
        const text = line.slice(timeRegex.lastIndex).trim();

        if (text) lines.push({ timeMs, text });
      }
    }

    return lines.sort((a, b) => a.timeMs - b.timeMs);
  }
}
