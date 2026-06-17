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
  // The library/playlist order the queue was built from, kept so shuffle can be
  // toggled off and the original ordering restored.
  originalQueue: Song[];
  queueIndex: number;
  // Where the current queue came from: a playlist id, 'favorites', or null for
  // the library. Lets the playlist screen know whether removing a song should
  // also drop it from the live playback queue.
  queueContextId: string | null;

  setCurrentSong: (song: Song | null) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setShuffleEnabled: (enabled: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setVolume: (volume: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setQueue: (queue: Song[], index: number, originalQueue?: Song[], contextId?: string | null) => void;
  setQueueIndex: (index: number) => void;
  // Drop a song from the in-memory queue (after it's removed from a playlist).
  removeSongFromQueue: (songId: string) => void;
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
  originalQueue: [],
  queueIndex: 0,
  queueContextId: null,

  setCurrentSong: (song) => set({ currentSong: song }),
  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setShuffleEnabled: (enabled) => set({ shuffleEnabled: enabled }),
  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setVolume: (volume) => set({ volume }),
  setSpeed: (speed) => set({ speed }),
  setQueue: (queue, queueIndex, originalQueue, contextId = null) =>
    set({ queue, queueIndex, originalQueue: originalQueue ?? queue, queueContextId: contextId }),
  setQueueIndex: (queueIndex) => set({ queueIndex }),
  removeSongFromQueue: (songId) =>
    set((s) => {
      const queue = s.queue.filter(x => x.id !== songId);
      const originalQueue = s.originalQueue.filter(x => x.id !== songId);
      const queueIndex = s.currentSong
        ? Math.max(0, queue.findIndex(x => x.id === s.currentSong!.id))
        : Math.min(s.queueIndex, Math.max(0, queue.length - 1));
      return { queue, originalQueue, queueIndex };
    }),
}));
