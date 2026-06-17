import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database/database';
import { SongModel } from '@/infrastructure/database/models/SongModel';
import type { Song, SortOrder, SortDirection } from '@/shared/types';
import type { Result } from '@/shared/types';

function modelToSong(m: SongModel): Song {
  return {
    id: m.id,
    filePath: m.filePath,
    title: m.title,
    artist: m.artist,
    album: m.album,
    albumArtist: m.albumArtist || undefined,
    year: m.year || undefined,
    genre: m.genre || undefined,
    duration: m.duration,
    fileSize: m.fileSize,
    bitRate: m.bitRate || undefined,
    sampleRate: m.sampleRate || undefined,
    trackNumber: m.trackNumber || undefined,
    artworkPath: m.artworkPath || undefined,
    artworkEmbedded: m.artworkEmbedded,
    label: m.label || undefined,
    composer: m.composer || undefined,
    comment: m.comment || undefined,
    source: m.source || undefined,
    lyrics: m.lyrics || undefined,
    lyricsSynced: m.lyricsSynced || undefined,
    extraMetadata: m.extraMetadata ? JSON.parse(m.extraMetadata) : undefined,
    isHidden: m.isHidden,
    playCount: m.playCount,
    lastPlayed: m.lastPlayed || undefined,
    lastPosition: m.lastPosition,
    createdAt: m.createdAt.getTime(),
    updatedAt: m.updatedAt.getTime(),
  };
}

const sortFieldMap: Record<SortOrder, string> = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  duration: 'duration',
  date_added: 'created_at',
  play_count: 'play_count',
  manual: 'title',
};

export class SongRepository {
  private collection = database.collections.get<SongModel>('songs');

  // Reactive observable for FlashList — auto-updates when DB changes
  observeAll(sortOrder: SortOrder = 'title', sortDir: SortDirection = 'asc') {
    return this.collection
      .query(
        Q.where('is_hidden', false),
        Q.sortBy(sortFieldMap[sortOrder], sortDir === 'asc' ? Q.asc : Q.desc),
      )
      .observe();
  }

  observeSearch(query: string, sortOrder: SortOrder = 'title') {
    const q = query.trim().toLowerCase();
    return this.collection
      .query(
        Q.where('is_hidden', false),
        Q.or(
          Q.where('title', Q.like(`%${q}%`)),
          Q.where('artist', Q.like(`%${q}%`)),
          Q.where('album', Q.like(`%${q}%`)),
        ),
        Q.sortBy(sortFieldMap[sortOrder], Q.asc),
      )
      .observe();
  }

  async getById(id: string): Promise<Song | null> {
    return this.findById(id);
  }

  async findById(id: string): Promise<Song | null> {
    try {
      const m = await this.collection.find(id);
      return modelToSong(m);
    } catch {
      return null;
    }
  }

  async getAll(sortOrder: SortOrder = 'title', sortDir: SortDirection = 'asc'): Promise<Song[]> {
    const records = await this.collection
      .query(
        Q.where('is_hidden', false),
        Q.sortBy(sortFieldMap[sortOrder], sortDir === 'asc' ? Q.asc : Q.desc),
      )
      .fetch();
    return records.map(modelToSong);
  }

  async getAlbums(): Promise<Array<{ album: string; artist: string; artworkPath?: string; count: number }>> {
    const songs = await this.getAll('album');
    const map = new Map<string, { album: string; artist: string; artworkPath?: string; count: number }>();
    for (const s of songs) {
      const key = `${s.album}__${s.albumArtist ?? s.artist}`;
      const existing = map.get(key);
      if (existing) { existing.count++; }
      else { map.set(key, { album: s.album, artist: s.albumArtist ?? s.artist, artworkPath: s.artworkPath, count: 1 }); }
    }
    return Array.from(map.values()).sort((a, b) => a.album.localeCompare(b.album));
  }

  async getArtists(): Promise<Array<{ artist: string; count: number }>> {
    const songs = await this.getAll('artist');
    const map = new Map<string, number>();
    for (const s of songs) { map.set(s.artist, (map.get(s.artist) ?? 0) + 1); }
    return Array.from(map.entries())
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => a.artist.localeCompare(b.artist));
  }

  async getGenres(): Promise<Array<{ genre: string; count: number }>> {
    const songs = await this.getAll('title');
    const map = new Map<string, number>();
    for (const s of songs) {
      const g = s.genre ?? 'Sin género';
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => a.genre.localeCompare(b.genre));
  }

  async updateLastPosition(id: string, positionMs: number): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.update(r => { r.lastPosition = positionMs; });
    });
  }

  // Forget the saved resume point (used when a song's position memory is off).
  async clearPosition(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.update(r => { r.lastPosition = 0; });
    });
  }

  async incrementPlayCount(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.update(r => {
        r.playCount = r.playCount + 1;
        r.lastPlayed = Date.now();
      });
    });
  }

  async hideSong(id: string): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const record = await this.collection.find(id);
        await record.update(r => { r.isHidden = true; });
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Hide failed'), code: 'HIDE_FAILED' };
    }
  }

  // Bring a hidden song back into the library.
  async unhideSong(id: string): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const record = await this.collection.find(id);
        await record.update(r => { r.isHidden = false; });
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Unhide failed'), code: 'UNHIDE_FAILED' };
    }
  }

  // The songs the user has hidden from the library (managed from Settings).
  async getHidden(): Promise<Song[]> {
    const records = await this.collection
      .query(
        Q.where('is_hidden', true),
        Q.sortBy('title', Q.asc),
      )
      .fetch();
    return records.map(modelToSong);
  }

  async deleteSongFromDB(id: string): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const record = await this.collection.find(id);
        await record.destroyPermanently();
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Delete failed'), code: 'DELETE_FAILED' };
    }
  }

  async updateArtwork(id: string, artworkPath: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.update(r => { r.artworkPath = artworkPath; });
    });
  }

  async updateLyrics(id: string, lyrics: string, lyricsSynced?: string): Promise<void> {
    await database.write(async () => {
      const record = await this.collection.find(id);
      await record.update(r => {
        r.lyrics = lyrics;
        if (lyricsSynced !== undefined) r.lyricsSynced = lyricsSynced;
      });
    });
  }
}
