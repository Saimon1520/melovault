import TrackPlayer, { Event, State } from 'react-native-track-player';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { PlayerStateRepository } from '@/infrastructure/database/PlayerStateRepository';

const songRepo = new SongRepository();
const playerStateRepo = new PlayerStateRepository();

// Saves current position every N ms while playing
const SAVE_INTERVAL_MS = 5000;

let saveIntervalId: ReturnType<typeof setInterval> | null = null;

export async function startPositionPersistence(): Promise<void> {
  stopPositionPersistence();

  saveIntervalId = setInterval(async () => {
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state !== State.Playing) return;

      const position = await TrackPlayer.getPosition();
      const track = await TrackPlayer.getActiveTrack();
      if (!track?.id) return;

      await songRepo.updateLastPosition(track.id as string, position);
      await playerStateRepo.save({
        currentTrackId: track.id as string,
        position,
        queueIndex: await TrackPlayer.getActiveTrackIndex() ?? 0,
      });
    } catch {
      // Silently ignore persistence errors — they should not affect playback
    }
  }, SAVE_INTERVAL_MS);
}

export function stopPositionPersistence(): void {
  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }
}

export async function savePositionOnTrackChange(): Promise<void> {
  try {
    const position = await TrackPlayer.getPosition();
    const track = await TrackPlayer.getActiveTrack();
    if (!track?.id || position < 1) return;

    await songRepo.updateLastPosition(track.id as string, position);
  } catch {
    // ignore
  }
}

export async function restoreLastSession(): Promise<void> {
  try {
    const saved = await playerStateRepo.load();
    if (!saved?.currentTrackId) return;

    const song = await songRepo.getById(saved.currentTrackId);
    if (!song) return;

    const queue = await TrackPlayer.getQueue();
    const trackIndex = queue.findIndex(t => t.id === saved.currentTrackId);

    if (trackIndex !== -1) {
      await TrackPlayer.skip(trackIndex);
      await TrackPlayer.seekTo(saved.position);
    } else {
      await TrackPlayer.add({
        id: song.id,
        url: `file://${song.filePath}`,
        title: song.title,
        artist: song.artist,
        album: song.album ?? undefined,
        artwork: song.artworkPath ? `file://${song.artworkPath}` : undefined,
        duration: song.duration,
      });
      await TrackPlayer.seekTo(saved.position);
    }
  } catch {
    // If restore fails, start fresh
  }
}
