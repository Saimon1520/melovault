import { useCallback } from 'react';
import { useProgress, useActiveTrack, State, usePlaybackState } from 'react-native-track-player';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

const service = TrackPlayerService.getInstance();

export function usePlayerControls() {
  const { isPlaying, shuffleEnabled, repeatMode, speed,
    setIsPlaying, setShuffleEnabled, setRepeatMode } = usePlayerStore();
  const { seekSeconds } = useSettingsStore();
  const { state } = usePlaybackState();
  const activeTrack = useActiveTrack();

  const actuallyPlaying = state === State.Playing;

  const togglePlayPause = useCallback(async () => {
    if (actuallyPlaying) {
      await service.pause();
      setIsPlaying(false);
    } else {
      await service.resume();
      setIsPlaying(true);
    }
  }, [actuallyPlaying, setIsPlaying]);

  const skipToNext = useCallback(async () => {
    await service.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await service.skipToPrevious();
  }, []);

  const seekBackward = useCallback(async () => {
    await service.seekBy(-seekSeconds);
  }, [seekSeconds]);

  const seekForward = useCallback(async () => {
    await service.seekBy(seekSeconds);
  }, [seekSeconds]);

  const toggleShuffle = useCallback(async () => {
    setShuffleEnabled(!shuffleEnabled);
  }, [shuffleEnabled, setShuffleEnabled]);

  const cycleRepeat = useCallback(async () => {
    const next = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
    setRepeatMode(next);
    await service.setRepeatMode(next);
  }, [repeatMode, setRepeatMode]);

  return {
    isPlaying: actuallyPlaying,
    shuffleEnabled,
    repeatMode,
    speed,
    activeTrack,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekBackward,
    seekForward,
    toggleShuffle,
    cycleRepeat,
  };
}

export function usePlayerProgress() {
  // useProgress from RNTP — runs on JS thread without triggering global re-renders
  return useProgress(250);
}
