import type { Song } from '@/shared/types';

export interface RawMetadata {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  year?: string;
  genre?: string;
  duration?: number;
  fileSize?: number;
  bitRate?: number;
  sampleRate?: number;
  trackNumber?: number;
  discNumber?: number;
  artworkBase64?: string;
  artworkMimeType?: string;
  label?: string;
  composer?: string;
  comment?: string;
  lyrics?: string;
  [key: string]: unknown; // dynamic extra fields
}

export class MetadataExtractor {
  // Extract known standard fields and collect extras dynamically
  static parseRawMetadata(raw: RawMetadata, filePath: string): Partial<Song> {
    const knownFields = new Set([
      'title', 'artist', 'album', 'albumArtist', 'year', 'genre',
      'duration', 'fileSize', 'bitRate', 'sampleRate', 'trackNumber',
      'discNumber', 'artworkBase64', 'artworkMimeType', 'label',
      'composer', 'comment', 'lyrics',
    ]);

    const extraMetadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!knownFields.has(key) && value != null && value !== '') {
        extraMetadata[key] = String(value);
      }
    }

    return {
      filePath,
      title: raw.title ?? this.fileNameFromPath(filePath),
      artist: raw.artist ?? 'Unknown Artist',
      album: raw.album ?? 'Unknown Album',
      albumArtist: raw.albumArtist,
      year: raw.year,
      genre: raw.genre,
      duration: raw.duration ?? 0,
      fileSize: raw.fileSize ?? 0,
      bitRate: raw.bitRate,
      sampleRate: raw.sampleRate,
      trackNumber: raw.trackNumber,
      discNumber: raw.discNumber,
      label: raw.label,
      composer: raw.composer,
      comment: raw.comment,
      lyrics: raw.lyrics,
      extraMetadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
      artworkEmbedded: raw.artworkBase64 != null,
    };
  }

  private static fileNameFromPath(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] ?? filePath;
    return fileName.replace(/\.[^.]+$/, ''); // remove extension
  }
}
