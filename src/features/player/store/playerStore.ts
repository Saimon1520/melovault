import { create } from 'zustand';
import type { Song, Playlist, RepeatMode, PlaybackSpeed } from '@/shared/types';

interface PlayerStore {
  currentSong: Song | null;
  currentPlaylist: Playlist | null;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  volume: number;
  speed: PlaybackSpeed;
  queue: Song[];
  queueIndex: number;

  setCurrentSong: (song: Song | null) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setShuffleEnabled: (enabled: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setVolume: (volume: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setQueue: (queue: Song[], index: number) => void;
  setQueueIndex: (index: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentSong: null,
  currentPlaylist: null,
  isPlaying: false,
  shuffleEnabled: false,
  repeatMode: 'none',
  volume: 1.0,
  speed: 1.0,
  queue: [],
  queueIndex: 0,

  setCurrentSong: (song) => set({ currentSong: song }),
  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setShuffleEnabled: (enabled) => set({ shuffleEnabled: enabled }),
  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setVolume: (volume) => set({ volume }),
  setSpeed: (speed) => set({ speed }),
  setQueue: (queue, queueIndex) => set({ queue, queueIndex }),
  setQueueIndex: (queueIndex) => set({ queueIndex }),
}));
