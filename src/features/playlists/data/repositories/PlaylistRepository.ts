import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database/database';
import { PlaylistModel } from '@/infrastructure/database/models/PlaylistModel';
import { PlaylistSongModel } from '@/infrastructure/database/models/PlaylistSongModel';
import type { Playlist, RepeatMode, SortOrder, Result } from '@/shared/types';

function modelToPlaylist(m: PlaylistModel, songCount = 0): Playlist {
  return {
    id: m.id,
    name: m.name,
    description: m.description || undefined,
    artworkPath: m.artworkPath || undefined,
    keepPosition: m.keepPosition,
    lastSongId: m.lastSongId || undefined,
    lastPositionMs: m.lastPositionMs,
    shuffleEnabled: m.shuffleEnabled,
    repeatMode: (m.repeatMode as RepeatMode) || 'none',
    sortOrder: (m.sortOrder as SortOrder) || 'manual',
    songCount,
    createdAt: m.createdAt.getTime(),
    updatedAt: m.updatedAt.getTime(),
  };
}

export class PlaylistRepository {
  private playlists = database.collections.get<PlaylistModel>('playlists');
  private junctions = database.collections.get<PlaylistSongModel>('playlist_songs');

  observeAll() {
    return this.playlists.query(Q.sortBy('name', Q.asc)).observe();
  }

  async getAll(): Promise<Playlist[]> {
    const records = await this.playlists.query(Q.sortBy('name', Q.asc)).fetch();
    const result: Playlist[] = [];
    for (const r of records) {
      const count = await this.junctions.query(Q.where('playlist_id', r.id)).fetchCount();
      result.push(modelToPlaylist(r, count));
    }
    return result;
  }

  async findById(id: string): Promise<Playlist | null> {
    try {
      const r = await this.playlists.find(id);
      const count = await this.junctions.query(Q.where('playlist_id', id)).fetchCount();
      return modelToPlaylist(r, count);
    } catch { return null; }
  }

  async getSongIds(playlistId: string): Promise<string[]> {
    const junctions = await this.junctions
      .query(Q.where('playlist_id', playlistId), Q.sortBy('position', Q.asc))
      .fetch();
    return junctions.map(j => j.songId);
  }

  async create(name: string, description = '', keepPosition = false): Promise<Result<Playlist>> {
    try {
      let playlist!: PlaylistModel;
      await database.write(async () => {
        playlist = await this.playlists.create(r => {
          r.name = name;
          r.description = description;
          r.keepPosition = keepPosition;
          r.lastPositionMs = 0;
          r.shuffleEnabled = false;
          r.repeatMode = 'none';
          r.sortOrder = 'manual';
        });
      });
      return { success: true, data: modelToPlaylist(playlist) };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Create failed'), code: 'CREATE_FAILED' };
    }
  }

  async update(id: string, changes: Partial<Pick<Playlist, 'name' | 'description' | 'keepPosition' | 'artworkPath'>>): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const record = await this.playlists.find(id);
        await record.update(r => {
          if (changes.name !== undefined) r.name = changes.name!;
          if (changes.description !== undefined) r.description = changes.description!;
          if (changes.keepPosition !== undefined) r.keepPosition = changes.keepPosition!;
          if (changes.artworkPath !== undefined) r.artworkPath = changes.artworkPath!;
        });
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Update failed'), code: 'UPDATE_FAILED' };
    }
  }

  async addSong(playlistId: string, songId: string): Promise<Result<void>> {
    try {
      const existing = await this.junctions
        .query(Q.where('playlist_id', playlistId), Q.where('song_id', songId))
        .fetchCount();
      if (existing > 0) return { success: true, data: undefined }; // already in playlist

      const count = await this.junctions.query(Q.where('playlist_id', playlistId)).fetchCount();
      await database.write(async () => {
        await this.junctions.create(r => {
          r.playlistId = playlistId;
          r.songId = songId;
          r.position = count;
          r.addedAt = Date.now();
        });
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Add song failed'), code: 'ADD_FAILED' };
    }
  }

  async removeSong(playlistId: string, songId: string): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const records = await this.junctions
          .query(Q.where('playlist_id', playlistId), Q.where('song_id', songId))
          .fetch();
        for (const r of records) await r.destroyPermanently();
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Remove failed'), code: 'REMOVE_FAILED' };
    }
  }

  async savePlaybackPosition(playlistId: string, songId: string, positionMs: number): Promise<void> {
    await database.write(async () => {
      const record = await this.playlists.find(playlistId);
      if (record.keepPosition) {
        await record.update(r => {
          r.lastSongId = songId;
          r.lastPositionMs = positionMs;
        });
      }
    });
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await database.write(async () => {
        const playlist = await this.playlists.find(id);
        const junctions = await this.junctions.query(Q.where('playlist_id', id)).fetch();
        for (const j of junctions) await j.destroyPermanently();
        await playlist.destroyPermanently();
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error('Delete failed'), code: 'DELETE_FAILED' };
    }
  }
}
