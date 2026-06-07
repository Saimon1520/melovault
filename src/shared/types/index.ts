// Result type — no throw, always explicit error handling
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E; code?: string };

// Audio formats supported
export type AudioFormat = 'mp3' | 'flac' | 'aac' | 'ogg' | 'wav' | 'm4a' | 'opus' | 'wma';

// Repeat modes
export type RepeatMode = 'none' | 'one' | 'all';

// Sort options
export type SortOrder = 'title' | 'artist' | 'album' | 'duration' | 'date_added' | 'play_count' | 'manual';
export type SortDirection = 'asc' | 'desc';

// Playback speed options
export type PlaybackSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0;

// Song entity
export interface Song {
  id: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: string;
  genre?: string;
  duration: number; // milliseconds
  fileSize: number; // bytes
  bitRate?: number;
  sampleRate?: number;
  trackNumber?: number;
  discNumber?: number;
  artworkPath?: string;
  artworkEmbedded: boolean;
  label?: string; // disquera
  composer?: string;
  comment?: string;
  source?: string; // download source
  lyrics?: string;
  lyricsSynced?: string; // LRC format
  extraMetadata?: Record<string, string>; // dynamic fields
  isHidden: boolean;
  playCount: number;
  lastPlayed?: number; // timestamp
  lastPosition: number; // ms — global position memory
  createdAt: number;
  updatedAt: number;
}

// Playlist entity
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artworkPath?: string;
  keepPosition: boolean; // selective persistence
  lastSongId?: string;
  lastPositionMs: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  sortOrder: SortOrder;
  songCount?: number;
  createdAt: number;
  updatedAt: number;
}

// Player state
export interface PlayerState {
  currentSongId?: string;
  currentPlaylistId?: string;
  positionMs: number;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  volume: number;
  speed: PlaybackSpeed;
  equalizerPresetId?: string;
  sleepTimerMs?: number;
  queue: string[]; // song IDs
  queueIndex: number;
}

// Bluetooth device
export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  type: 'speaker' | 'headphones' | 'earbuds' | 'unknown';
}

// Equalizer band
export interface EqualizerBand {
  frequency: number; // Hz
  gain: number; // dB, range -12 to +12
}

// Equalizer preset
export interface EqualizerPreset {
  id: string;
  name: string;
  isDefault: boolean;
  bands: EqualizerBand[];
}

// Lyrics line (LRC format)
export interface LyricsLine {
  timeMs: number;
  text: string;
}
