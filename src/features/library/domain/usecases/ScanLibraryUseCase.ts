import { database } from '@/infrastructure/database/database';
import { MediaScanner, type ScanProgress } from '@/infrastructure/filesystem/MediaScanner';
import { SongModel } from '@/infrastructure/database/models/SongModel';
import type { Result } from '@/shared/types';

export interface ScanResult {
  added: number;
  skipped: number;
  total: number;
}

export class ScanLibraryUseCase {
  async execute(
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<Result<ScanResult>> {
    try {
      const rawSongs = await MediaScanner.scanAllAudio(onProgress);

      const songsCollection = database.collections.get<SongModel>('songs');

      // Get existing file paths to avoid duplicates
      const existingPaths = new Set(
        (await songsCollection.query().fetch()).map(s => s.filePath),
      );

      let added = 0;
      let skipped = 0;

      await database.write(async () => {
        for (const rawSong of rawSongs) {
          if (!rawSong.filePath) continue;

          if (existingPaths.has(rawSong.filePath)) {
            skipped++;
            continue;
          }

          await songsCollection.create((record) => {
            record.filePath = rawSong.filePath!;
            record.title = rawSong.title ?? '';
            record.artist = rawSong.artist ?? '';
            record.album = rawSong.album ?? '';
            record.albumArtist = rawSong.albumArtist ?? '';
            record.year = rawSong.year ?? '';
            record.genre = rawSong.genre ?? '';
            record.duration = rawSong.duration ?? 0;
            record.fileSize = rawSong.fileSize ?? 0;
            record.bitRate = rawSong.bitRate ?? 0;
            record.sampleRate = rawSong.sampleRate ?? 0;
            record.trackNumber = rawSong.trackNumber ?? 0;
            record.artworkPath = rawSong.artworkPath ?? '';
            record.artworkEmbedded = rawSong.artworkEmbedded ?? false;
            record.label = rawSong.label ?? '';
            record.composer = rawSong.composer ?? '';
            record.comment = rawSong.comment ?? '';
            record.source = rawSong.source ?? '';
            record.lyrics = rawSong.lyrics ?? '';
            record.lyricsSynced = rawSong.lyricsSynced ?? '';
            record.extraMetadata = rawSong.extraMetadata
              ? JSON.stringify(rawSong.extraMetadata)
              : '';
            record.isHidden = false;
            record.playCount = 0;
            record.lastPlayed = 0;
            record.lastPosition = 0;
          });

          added++;
        }
      });

      return {
        success: true,
        data: { added, skipped, total: rawSongs.length },
      };
    } catch (error) {
      console.error('[ScanLibrary] FAILED:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : '');
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Scan failed'),
        code: 'SCAN_FAILED',
      };
    }
  }
}
