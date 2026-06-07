import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps } from '@react-navigation/native';

// Bottom Tab Navigator params
export type BottomTabParamList = {
  Library: undefined;
  Playlists: undefined;
  Search: undefined;
  Settings: undefined;
};

// Library Stack params
export type LibraryStackParamList = {
  LibraryMain: undefined;
  AlbumDetail: { albumId: string; albumName: string };
  ArtistDetail: { artistId: string; artistName: string };
  SongDetail: { songId: string };
};

// Playlist Stack params
export type PlaylistStackParamList = {
  PlaylistsMain: undefined;
  PlaylistDetail: { playlistId: string; playlistName: string };
};

// Root Stack (includes modal screens like NowPlaying)
export type RootStackParamList = {
  Main: undefined;
  NowPlaying: undefined;
  Queue: undefined;
  Lyrics: undefined;
  BluetoothDevices: undefined;
  SleepTimer: undefined;
  Equalizer: undefined;
};

// Screen prop helpers
export type LibraryScreenProps<T extends keyof LibraryStackParamList> = StackScreenProps<LibraryStackParamList, T>;
export type PlaylistScreenProps<T extends keyof PlaylistStackParamList> = StackScreenProps<PlaylistStackParamList, T>;
export type RootScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>;
