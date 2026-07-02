import * as MediaLibrary from 'expo-media-library/legacy';
import { database } from '@/infrastructure/database/database';
import { MediaScanner } from '@/infrastructure/filesystem/MediaScanner';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { SongModel } from '@/infrastructure/database/models/SongModel';

function modelToPartialSong(m: SongModel) {
  return {
    id: m.id,
    filePath: m.filePath,
    artworkPath: m.artworkPath || undefined,
    artworkEmbedded: m.artworkEmbedded,
  };
}

export interface AutoScanResult {
  added: number;
  artworkRepaired: number;
}

export class AutoScanUseCase {
  private songRepo = new SongRepository();

  // Silently detects and inserts new audio files, then repairs any artwork whose
  // cached file was cleared by Android.
  async execute(): Promise<AutoScanResult> {
    const songsCollection = database.collections.get<SongModel>('songs');

    // ── Step 1: repair missing artwork (runs even when count hasn't changed) ──
    const artworkRepaired = await this.repairMissingArtwork(songsCollection).catch(() => 0);

    // ── Step 2: quick count check for new songs ──
    const firstPage = await MediaLibrary.getAssetsAsync({
      first: 1,
      mediaType: MediaLibrary.MediaType.audio,
    });
    const mediaTotal = firstPage.totalCount;
    const dbCount = await songsCollection.query().fetchCount();

    // No new files detected (or user deleted songs externally — let them
    // handle that with a manual scan).
    if (mediaTotal <= dbCount) return { added: 0, artworkRepaired };

    // ── Step 3: delta scan — only process unknown files ──
    // Re-fetch after repair so the known-paths set is fresh.
    const existing = await songsCollection.query().fetch();
    const knownPaths = new Set(existing.map(s => s.filePath));

    const newSongs = await MediaScanner.scanNewOnly(knownPaths);
    if (newSongs.length === 0) return { added: 0, artworkRepaired };

    let added = 0;
    await database.write(async () => {
      for (const rawSong of newSongs) {
        if (!rawSong.filePath || knownPaths.has(rawSong.filePath)) continue;
        await songsCollection.create((record) => {
          record.filePath        = rawSong.filePath!;
          record.title           = rawSong.title           ?? '';
          record.artist          = rawSong.artist          ?? '';
          record.album           = rawSong.album           ?? '';
          record.albumArtist     = rawSong.albumArtist     ?? '';
          record.year            = rawSong.year            ?? '';
          record.genre           = rawSong.genre           ?? '';
          record.duration        = rawSong.duration        ?? 0;
          record.fileSize        = rawSong.fileSize        ?? 0;
          record.bitRate         = rawSong.bitRate         ?? 0;
          record.sampleRate      = rawSong.sampleRate      ?? 0;
          record.trackNumber     = rawSong.trackNumber     ?? 0;
          record.artworkPath     = rawSong.artworkPath     ?? '';
          record.artworkEmbedded = rawSong.artworkEmbedded ?? false;
          record.label           = rawSong.label           ?? '';
          record.composer        = rawSong.composer        ?? '';
          record.comment         = rawSong.comment         ?? '';
          record.source          = rawSong.source          ?? '';
          record.lyrics          = rawSong.lyrics          ?? '';
          record.lyricsSynced    = rawSong.lyricsSynced    ?? '';
          record.extraMetadata   = rawSong.extraMetadata
            ? JSON.stringify(rawSong.extraMetadata)
            : '';
          record.isHidden     = false;
          record.playCount    = 0;
          record.lastPlayed   = 0;
          record.lastPosition = 0;
        });
        added++;
      }
    });

    return { added, artworkRepaired };
  }

  // Checks every song that claims to have embedded art; if the cached file is
  // missing (Android cleared the cache under storage pressure), re-extracts from
  // the audio file itself and updates the DB row. Returns the number of repairs.
  private async repairMissingArtwork(
    songsCollection: ReturnType<typeof database.collections.get<SongModel>>,
  ): Promise<number> {
    const all = await songsCollection.query().fetch();
    const songs = all.map(modelToPartialSong) as Parameters<typeof MediaScanner.refreshMissingArtwork>[0];

    const updates = await MediaScanner.refreshMissingArtwork(songs);
    const batch = Object.entries(updates).map(([id, artworkPath]) => ({ id, artworkPath }));
    await this.songRepo.updateArtworkBatch(batch);
    return batch.length;
  }
}
