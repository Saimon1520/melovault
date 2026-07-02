import * as MediaLibrary from 'expo-media-library/legacy';
import { database } from '@/infrastructure/database/database';
import { MediaScanner } from '@/infrastructure/filesystem/MediaScanner';
import { SongModel } from '@/infrastructure/database/models/SongModel';

export class AutoScanUseCase {
  // Silently detects and inserts new audio files without re-processing the
  // existing library. Returns the number of songs added (0 = nothing to do).
  async execute(): Promise<number> {
    // Quick count check: skip completely if the number of audio assets in
    // MediaStore hasn't grown beyond what's already in the DB.
    const firstPage = await MediaLibrary.getAssetsAsync({
      first: 1,
      mediaType: MediaLibrary.MediaType.audio,
    });
    const mediaTotal = firstPage.totalCount;

    const songsCollection = database.collections.get<SongModel>('songs');
    const dbCount = await songsCollection.query().fetchCount();

    // No new files detected (or user deleted songs externally — ignore that
    // case, let the user handle it with a manual scan).
    if (mediaTotal <= dbCount) return 0;

    // Build the known-paths set and run a delta scan.
    const existing = await songsCollection.query().fetch();
    const knownPaths = new Set(existing.map(s => s.filePath));

    const newSongs = await MediaScanner.scanNewOnly(knownPaths);
    if (newSongs.length === 0) return 0;

    let added = 0;
    await database.write(async () => {
      for (const rawSong of newSongs) {
        if (!rawSong.filePath || knownPaths.has(rawSong.filePath)) continue;
        await songsCollection.create((record) => {
          record.filePath     = rawSong.filePath!;
          record.title        = rawSong.title        ?? '';
          record.artist       = rawSong.artist       ?? '';
          record.album        = rawSong.album        ?? '';
          record.albumArtist  = rawSong.albumArtist  ?? '';
          record.year         = rawSong.year         ?? '';
          record.genre        = rawSong.genre        ?? '';
          record.duration     = rawSong.duration     ?? 0;
          record.fileSize     = rawSong.fileSize     ?? 0;
          record.bitRate      = rawSong.bitRate      ?? 0;
          record.sampleRate   = rawSong.sampleRate   ?? 0;
          record.trackNumber  = rawSong.trackNumber  ?? 0;
          record.artworkPath  = rawSong.artworkPath  ?? '';
          record.artworkEmbedded = rawSong.artworkEmbedded ?? false;
          record.label        = rawSong.label        ?? '';
          record.composer     = rawSong.composer     ?? '';
          record.comment      = rawSong.comment      ?? '';
          record.source       = rawSong.source       ?? '';
          record.lyrics       = rawSong.lyrics       ?? '';
          record.lyricsSynced = rawSong.lyricsSynced ?? '';
          record.extraMetadata = rawSong.extraMetadata
            ? JSON.stringify(rawSong.extraMetadata)
            : '';
          record.isHidden   = false;
          record.playCount  = 0;
          record.lastPlayed = 0;
          record.lastPosition = 0;
        });
        added++;
      }
    });

    return added;
  }
}
