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
  // Mirror a manual reorder from the queue screen: put `songId` right before
  // (direction 'up') or right after ('down') `neighborId`. Keeps the edit when
  // the queue loops into its next lap and in the saved queue.
  moveSongInQueue: (songId: string, neighborId: string, direction: 'up' | 'down') => void;
}

function moveNextTo(list: Song[], songId: string, neighborId: string, direction: 'up' | 'down'): Song[] {
  const from = list.findIndex(x => x.id === songId);
  if (from === -1 || !list.some(x => x.id === neighborId)) return list;
  const next = [...list];
  const [song] = next.splice(from, 1);
  const at = next.findIndex(x => x.id === neighborId);
  next.splice(direction === 'up' ? at : at + 1, 0, song!);
  return next;
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
  moveSongInQueue: (songId, neighborId, direction) =>
    set((s) => {
      const queue = moveNextTo(s.queue, songId, neighborId, direction);
      // With shuffle on, the next lap is re-shuffled from the original order
      // anyway, and toggling shuffle off must still restore that order — so the
      // edit only touches the canonical order when shuffle is off.
      const originalQueue = s.shuffleEnabled
        ? s.originalQueue
        : moveNextTo(s.originalQueue, songId, neighborId, direction);
      const queueIndex = s.currentSong
        ? Math.max(0, queue.findIndex(x => x.id === s.currentSong!.id))
        : s.queueIndex;
      return { queue, originalQueue, queueIndex };
    }),
}));
