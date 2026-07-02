import { NativeModules, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system';
import type { Song } from '@/shared/types';
import { SUPPORTED_AUDIO_FORMATS } from '@/shared/constants/audioFormats';

// Native MediaStore-backed tag reader (Android). Returns, keyed by MediaStore
// id: { filePath, fileSize, title, artist, album, albumArtist, composer,
// genre, year, trackNumber, duration, bitRate }. Falls back gracefully when
// unavailable (e.g. iOS).
interface NativeAudioMeta {
  filePath?: string;
  fileSize?: number;
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  composer?: string;
  genre?: string;
  year?: string;
  trackNumber?: number;
  duration?: number;
  bitRate?: number;
}
const AudioMetadata: {
  getByIds(ids: string[]): Promise<Record<string, NativeAudioMeta>>;
  extractArtwork(ids: string[]): Promise<Record<string, string>>;
} | undefined = NativeModules.AudioMetadata;

async function fetchNativeArtwork(ids: string[]): Promise<Record<string, string>> {
  if (Platform.OS !== 'android' || !AudioMetadata?.extractArtwork || ids.length === 0) return {};
  const out: Record<string, string> = {};
  const CHUNK = 60; // image decoding is heavier than a metadata query
  for (let i = 0; i < ids.length; i += CHUNK) {
    try {
      const part = await AudioMetadata.extractArtwork(ids.slice(i, i + CHUNK));
      Object.assign(out, part);
    } catch {
      // Ignore — these songs fall back to the default artwork.
    }
  }
  return out;
}

async function fetchNativeMetadata(ids: string[]): Promise<Record<string, NativeAudioMeta>> {
  if (Platform.OS !== 'android' || !AudioMetadata?.getByIds || ids.length === 0) return {};
  const out: Record<string, NativeAudioMeta> = {};
  // SQLite limits the number of bound variables (~999), so query in chunks.
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    try {
      const part = await AudioMetadata.getByIds(ids.slice(i, i + CHUNK));
      Object.assign(out, part);
    } catch {
      // Ignore — fall back to filename-derived data for this chunk.
    }
  }
  return out;
}

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

    // Batch-read real tag metadata (artist/album/title/…) from MediaStore,
    // plus extract & cache embedded cover art.
    const ids = allAssets.map(a => a.id);
    const meta = await fetchNativeMetadata(ids);
    const artwork = await fetchNativeArtwork(ids);

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

      const m = meta[asset.id] ?? {};
      // Prefer the real filesystem path from MediaStore; fall back to a
      // (slower) per-asset lookup only when the native module didn't supply it.
      let filePath = m.filePath;
      if (!filePath) {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        filePath = assetInfo.localUri ?? asset.uri;
      }

      songs.push({
        id: asset.id,
        filePath,
        title: m.title || this.cleanTitle(asset.filename),
        artist: m.artist,
        album: m.album,
        albumArtist: m.albumArtist,
        composer: m.composer,
        genre: m.genre,
        year: m.year,
        trackNumber: m.trackNumber,
        bitRate: m.bitRate,
        fileSize: m.fileSize ?? 0,
        duration: m.duration ?? Math.round(asset.duration * 1000), // ms
        artworkPath: artwork[asset.id],
        artworkEmbedded: artwork[asset.id] != null,
        createdAt: asset.creationTime,
        updatedAt: asset.modificationTime,
        isHidden: false,
        playCount: 0,
        lastPosition: 0,
      });
    }

    return songs;
  }

  // Find the MediaStore asset id for a file path. Needed for deletion: on
  // scoped storage we can only delete shared audio through MediaLibrary, which
  // keys on the MediaStore id — and we don't persist that id on the song row
  // (WatermelonDB assigns its own random id, the asset id is dropped at scan).
  static async resolveAssetId(filePath: string): Promise<string | undefined> {
    if (Platform.OS !== 'android') return undefined;

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.status !== 'granted') return undefined;

    const targetName = decodeURIComponent(filePath.split('/').pop() ?? '');
    if (!targetName) return undefined;

    // First pass: collect every asset whose filename matches (cheap — no
    // per-asset lookups). Most libraries have a single match.
    const candidates: string[] = [];
    let hasNextPage = true;
    let after: string | undefined;
    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        after,
        first: 200,
        sortBy: [MediaLibrary.SortBy.default],
      });
      for (const asset of page.assets) {
        if (asset.filename === targetName) candidates.push(asset.id);
      }
      hasNextPage = page.hasNextPage;
      after = page.endCursor;
    }

    if (candidates.length <= 1) return candidates[0];

    // Several files share the name — disambiguate by the real path from the
    // native MediaStore reader.
    const norm = (p?: string) => (p ?? '').replace(/^file:\/\//, '');
    const target = norm(filePath);
    const meta = await fetchNativeMetadata(candidates);
    for (const id of candidates) {
      if (norm(meta[id]?.filePath) === target) return id;
    }
    return candidates[0];
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

  // Delta scan: only returns songs whose filePath is not in `knownPaths`.
  // Much faster than scanAllAudio when the library is mostly stable — metadata
  // and artwork are fetched only for the new assets, not the whole library.
  static async scanNewOnly(knownPaths: Set<string>): Promise<Partial<Song>[]> {
    if (Platform.OS !== 'android') return [];

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.status !== 'granted') return [];

    // Pre-build a set of known basenames for a quick O(1) pre-filter.
    // This avoids calling the native MediaStore query for assets we definitely
    // already have (common case: only a handful of new files).
    const knownFilenames = new Set([...knownPaths].map(p => p.split('/').pop() ?? ''));

    const allAssets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let after: string | undefined;
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

    // Pre-filter by filename: candidates are assets whose filename is NOT already
    // known. False negatives are possible (two songs with the same filename in
    // different folders) but acceptable — the user can always do a manual scan.
    const candidates = allAssets.filter(a => !knownFilenames.has(a.filename));
    if (candidates.length === 0) return [];

    // Resolve real paths via native MediaStore to catch false-positive filename
    // matches (e.g. two "01 - Intro.mp3" in different albums).
    const candidateIds = candidates.map(a => a.id);
    const meta = await fetchNativeMetadata(candidateIds);

    const trulyNew = candidates.filter(a => {
      const path = meta[a.id]?.filePath;
      return !path || !knownPaths.has(path);
    });
    if (trulyNew.length === 0) return [];

    const newIds = trulyNew.map(a => a.id);
    const artwork = await fetchNativeArtwork(newIds);

    const songs: Partial<Song>[] = [];
    for (const asset of trulyNew) {
      const extension = asset.filename.split('.').pop()?.toLowerCase() ?? '';
      if (!SUPPORTED_AUDIO_FORMATS.includes(extension as any)) continue;

      const m = meta[asset.id] ?? {};
      let filePath = m.filePath;
      if (!filePath) {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        filePath = assetInfo.localUri ?? asset.uri;
      }
      if (!filePath || knownPaths.has(filePath)) continue;

      songs.push({
        filePath,
        title: m.title || this.cleanTitle(asset.filename),
        artist: m.artist,
        album: m.album,
        albumArtist: m.albumArtist,
        composer: m.composer,
        genre: m.genre,
        year: m.year,
        trackNumber: m.trackNumber,
        bitRate: m.bitRate,
        fileSize: m.fileSize ?? 0,
        duration: m.duration ?? Math.round(asset.duration * 1000),
        artworkPath: artwork[asset.id],
        artworkEmbedded: artwork[asset.id] != null,
        createdAt: asset.creationTime,
        updatedAt: asset.modificationTime,
        isHidden: false,
        playCount: 0,
        lastPosition: 0,
      });
    }

    return songs;
  }

  private static cleanTitle(filename: string): string {
    return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
  }
}
