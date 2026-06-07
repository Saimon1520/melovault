import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import type { Song } from '@/shared/types';
import { MetadataExtractor } from '@/infrastructure/metadata/MetadataExtractor';
import { SUPPORTED_AUDIO_FORMATS } from '@/shared/constants/audioFormats';

export interface ScanProgress {
  scanned: number;
  total: number;
  currentFile: string;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

export class MediaScanner {
  // Scans ALL audio files on the device, paginating through the entire media library
  static async scanAllAudio(
    onProgress?: ScanProgressCallback,
  ): Promise<Partial<Song>[]> {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Se necesita permiso para acceder a los archivos de audio del dispositivo.');
    }

    const allAssets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let after: string | undefined;

    // Paginate through all audio assets — handles libraries of 10,000+ songs
    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        after,
        first: 200,
        sortBy: [MediaLibrary.SortBy.default],
      });

      allAssets.push(...page.assets);
      hasNextPage = page.hasNextPage;
      after = page.endCursor;
    }

    const songs: Partial<Song>[] = [];
    const total = allAssets.length;

    for (let i = 0; i < allAssets.length; i++) {
      const asset = allAssets[i];

      if (!asset) continue;

      onProgress?.({
        scanned: i + 1,
        total,
        currentFile: asset.filename,
      });

      // Filter by supported formats
      const extension = asset.filename.split('.').pop()?.toLowerCase() ?? '';
      if (!SUPPORTED_AUDIO_FORMATS.includes(extension as any)) continue;

      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      const filePath = assetInfo.localUri ?? asset.uri;

      songs.push({
        id: asset.id,
        filePath,
        title: this.cleanTitle(asset.filename),
        duration: Math.round(asset.duration * 1000), // convert to ms
        createdAt: asset.creationTime,
        updatedAt: asset.modificationTime,
        artworkEmbedded: false,
        isHidden: false,
        playCount: 0,
        lastPosition: 0,
      });
    }

    return songs;
  }

  // Also scan filesystem directories directly (catches files MediaLibrary misses)
  static async scanDirectory(
    dirPath: string,
    onProgress?: ScanProgressCallback,
  ): Promise<Partial<Song>[]> {
    const songs: Partial<Song>[] = [];

    try {
      const contents = await FileSystem.readDirectoryAsync(dirPath);
      const audioFiles = contents.filter(file => {
        const ext = file.split('.').pop()?.toLowerCase() ?? '';
        return SUPPORTED_AUDIO_FORMATS.includes(ext as any);
      });

      for (let i = 0; i < audioFiles.length; i++) {
        const fileName = audioFiles[i];
        if (!fileName) continue;

        const filePath = `${dirPath}/${fileName}`;
        onProgress?.({ scanned: i + 1, total: audioFiles.length, currentFile: fileName });

        const info = await FileSystem.getInfoAsync(filePath);
        if (!info.exists || info.isDirectory) continue;

        songs.push({
          filePath,
          title: this.cleanTitle(fileName),
          fileSize: info.size ?? 0,
          artworkEmbedded: false,
          isHidden: false,
          playCount: 0,
          lastPosition: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Recurse into subdirectories
      const subdirs = contents.filter(async (item) => {
        const info = await FileSystem.getInfoAsync(`${dirPath}/${item}`);
        return info.isDirectory;
      });

      for (const subdir of subdirs) {
        const subSongs = await this.scanDirectory(`${dirPath}/${subdir}`, onProgress);
        songs.push(...subSongs);
      }
    } catch {
      // Directory not accessible — skip silently
    }

    return songs;
  }

  private static cleanTitle(filename: string): string {
    return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
  }
}
