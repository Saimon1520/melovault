import TrackPlayer, { Event, State } from 'react-native-track-player';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { PlayerStateRepository } from '@/infrastructure/database/PlayerStateRepository';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { shouldRememberPosition, isRememberedNow, inheritsKeepPositionPlaylist } from './positionPolicy';

let songRepo: SongRepository | null = null;
let playerStateRepo: PlayerStateRepository | null = null;

function repos() {
  if (!songRepo) songRepo = new SongRepository();
  if (!playerStateRepo) playerStateRepo = new PlayerStateRepository();
  return { songRepo, playerStateRepo };
}

// Cache ONLY the playlist-inheritance half of the decision (it hits the DB) for
// the active track, invalidated on track change. The per-song opt-in is read
// fresh every call so toggling "Recordar posición" mid-playback is seen at once
// (the old cache only refreshed on track change, so the toggle never took).
let playlistInheritCache: { id: string; inherits: boolean } | null = null;
async function remembersFor(trackId: string): Promise<boolean> {
  if (isRememberedNow(trackId)) return true;
  if (playlistInheritCache?.id === trackId) return playlistInheritCache.inherits;
  const inherits = await inheritsKeepPositionPlaylist(trackId);
  playlistInheritCache = { id: trackId, inherits };
  return inherits;
}
export function invalidateRememberCache(): void {
  playlistInheritCache = null;
}

const SAVE_INTERVAL_MS = 2000;   // foreground periodic backup
const SAVE_THROTTLE_MS = 1200;   // de-dupe the multiple triggers
let saveIntervalId: ReturnType<typeof setInterval> | null = null;
let lastSaveAt = 0;

// Persist the CURRENT position immediately. Called periodically (interval +
// playback-progress event, which keeps firing in the background) and, with
// `force`, the instant the app goes to the background/closes — so reopening
// resumes at the exact second instead of the last 5s checkpoint.
export async function savePositionNow(force = false, overridePositionSec?: number): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSaveAt < SAVE_THROTTLE_MS) return;
  try {
    // After a seek, getPosition() can still report the pre-seek value for a
    // tick, so the caller passes the target position explicitly.
    const position = overridePositionSec ?? await TrackPlayer.getPosition();
    const track = await TrackPlayer.getActiveTrack();
    if (track?.id == null) return;
    lastSaveAt = now;

    const remember = await remembersFor(track.id as string);
    const positionMs = Math.round(position * 1000); // getPosition() is seconds
    if (remember) {
      await repos().songRepo.updateLastPosition(track.id as string, positionMs);
    }
    await repos().playerStateRepo.save({
      currentTrackId: track.id as string,
      position: remember ? positionMs : 0,
      queueIndex: await TrackPlayer.getActiveTrackIndex() ?? 0,
    });
  } catch {
    // Silently ignore persistence errors — they should not affect playback
  }
}

export async function startPositionPersistence(): Promise<void> {
  stopPositionPersistence();
  saveIntervalId = setInterval(async () => {
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) savePositionNow();
  }, SAVE_INTERVAL_MS);
}

export function stopPositionPersistence(): void {
  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }
}

// Called on Event.PlaybackActiveTrackChanged. The event carries the OUTGOING
// track + the position it was at, so we can save where the user left a song
// when they switch away from it (not the incoming track, which is at ~0).
export async function savePositionOnTrackChange(
  event?: { lastTrack?: { id?: string | number } | null; lastPosition?: number },
): Promise<void> {
  try {
    invalidateRememberCache(); // the new active track gets a fresh decision
    const lastId = event?.lastTrack?.id;
    const lastPos = event?.lastPosition ?? 0;
    if (lastId == null || lastPos < 1) return;

    if (await shouldRememberPosition(String(lastId))) {
      await repos().songRepo.updateLastPosition(String(lastId), Math.round(lastPos * 1000));
    }
  } catch {
    // ignore
  }
}

export async function restoreLastSession(): Promise<void> {
  try {
    const saved = await repos().playerStateRepo.load();
    if (!saved?.currentTrackId) return;

    const song = await repos().songRepo.getById(saved.currentTrackId);
    if (!song) return;

    // Make the restored song the store's current song so the player UI (e.g. the
    // "…" options menu) has a song to act on after a cold start.
    usePlayerStore.getState().setCurrentSong(song);

    const positionSec = (saved.position ?? 0) / 1000; // stored in ms

    const queue = await TrackPlayer.getQueue();
    const trackIndex = queue.findIndex(t => t.id === saved.currentTrackId);

    if (trackIndex !== -1) {
      await TrackPlayer.skip(trackIndex);
    } else {
      await TrackPlayer.add({
        id: song.id,
        url: song.filePath,
        title: song.title,
        artist: song.artist,
        album: song.album ?? undefined,
        artwork: song.artworkPath || undefined, // already a file:// URI
        duration: song.duration,
      });
    }
    if (positionSec > 0) await TrackPlayer.seekTo(positionSec);
    // Open restored but paused — the user decides when to resume.
    await TrackPlayer.pause();
  } catch {
    // If restore fails, start fresh
  }
}
