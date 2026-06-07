const LRCLIB_BASE_URL = 'https://lrclib.net/api';

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

export class LRCLibService {
  static async searchLyrics(
    title: string,
    artist: string,
    album?: string,
    durationSeconds?: number,
  ): Promise<LRCLibTrack | null> {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    if (album) params.set('album_name', album);
    if (durationSeconds) params.set('duration', String(Math.round(durationSeconds)));

    const url = `${LRCLIB_BASE_URL}/get?${params.toString()}`;

    const response = await fetch(url, {
      headers: { 'Lrclib-Client': 'MeloVault/1.0.0 (https://github.com/saimonvargas/melovault)' },
    });

    if (!response.ok) return null;
    return response.json() as Promise<LRCLibTrack>;
  }

  static parseLRC(lrc: string): Array<{ timeMs: number; text: string }> {
    const lines: Array<{ timeMs: number; text: string }> = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    for (const line of lrc.split('\n')) {
      let match: RegExpExecArray | null;
      let lastIndex = 0;

      // eslint-disable-next-line no-cond-assign
      while ((match = timeRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1] ?? '0', 10);
        const seconds = parseInt(match[2] ?? '0', 10);
        const ms = parseInt((match[3] ?? '0').padEnd(3, '0'), 10);
        const timeMs = (minutes * 60 + seconds) * 1000 + ms;
        const text = line.slice(timeRegex.lastIndex).trim();

        if (text) lines.push({ timeMs, text });
        lastIndex = timeRegex.lastIndex;
      }
    }

    return lines.sort((a, b) => a.timeMs - b.timeMs);
  }
}
