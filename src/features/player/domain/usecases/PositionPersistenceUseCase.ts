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

// The notification "stop" button reset()s the player to dismiss the
// notification. reset() fires a PlaybackActiveTrackChanged whose `lastPosition`
// can be STALE (e.g. the position from before a recent seek). The stop handler
// already saved the exact position, so that one track-change save is redundant
// and must NOT overwrite the good value — suppress it once.
let skipNextTrackChangeSaveFlag = false;
export function skipNextTrackChangeSave(): void {
  skipNextTrackChangeSaveFlag = true;
}

// The periodic save is only a crash/kill backup — graceful exits (pause,
// app-background, track change, stop) force-save the exact position, so this
// cadence can be relaxed a lot to cut background DB/AsyncStorage writes (and the
// battery they cost) without losing on-close precision. Worst-case loss on a
// hard kill is bounded by this interval.
const SAVE_INTERVAL_MS = 5000;   // periodic backup while playing
const SAVE_THROTTLE_MS = 5000;   // de-dupe the multiple triggers
let saveIntervalId: ReturnType<typeof setInterval> | null = null;
let lastSaveAt = 0;
// Signature of the last persisted player state — skip the AsyncStorage write
// when nothing changed (e.g. a non-remember song whose stored position stays 0,
// so only a track/queue change is worth writing).
let lastPlayerStateSig = '';

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
    const queueIndex = await TrackPlayer.getActiveTrackIndex() ?? 0;
    const savedPosition = remember ? positionMs : 0;
    const sig = `${track.id}|${queueIndex}|${savedPosition}`;
    // Skip redundant writes — for a non-remember song the stored position is
    // pinned at 0, so the signature only changes when the track/queue does.
    if (sig !== lastPlayerStateSig) {
      lastPlayerStateSig = sig;
      await repos().playerStateRepo.save({
        currentTrackId: track.id as string,
        position: savedPosition,
        queueIndex,
      });
    }
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
    if (skipNextTrackChangeSaveFlag) {
      skipNextTrackChangeSaveFlag = false;
      return; // the stop handler already saved the exact position — don't clobber it
    }
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

let restoring = false;

export async function restoreLastSession(): Promise<void> {
  if (restoring) return; // guard against overlapping cold-start + foreground calls
  restoring = true;
  try {
    // Only restore when the player is empty. This makes it safe to call on every
    // app foreground: after the notification "stop" cleared the queue, the player
    // is empty here so the saved session (song or playlist, at its saved
    // position) gets reloaded; a warm reopen of live/paused playback still has
    // its track and is left untouched.
    const active = await TrackPlayer.getActiveTrack();
    if (active?.id != null) return;

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
  } finally {
    restoring = false;
  }
}
