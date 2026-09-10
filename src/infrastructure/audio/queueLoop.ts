import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { shuffle } from '@/shared/utils/shuffle';

/**
 * Keeps playback endless by APPENDING the next pass before the current one runs
 * out, instead of waiting for the queue to actually end.
 *
 * Why not just react to `PlaybackQueueEnded`? Because by then it's already too
 * late on Android: the moment the last track finishes, RNTP's notification stops
 * being "ongoing" and MusicService leaves the foreground. MeloVault sets
 * `stopForegroundGracePeriod` to 0 (so the notification's stop button dismisses
 * instantly), which is exactly the window RNTP reserves — in its own words — for
 * "queuing new media after the user's queue is complete". With 0 there is no
 * window, so on aggressive OEM builds the service can be torn down before the JS
 * re-queue lands and playback just… stops. Appending ahead of time means the
 * player always has a `nextItem`, ENDED never fires, the service never leaves
 * the foreground, and the loop is seamless instead of a stop/reset/replay.
 *
 * `PlaybackQueueEnded` stays wired up in playbackService as a last-resort net.
 */

// Rows kept behind the active track after a prune, so skipToPrevious still works.
const HISTORY_KEEP = 30;

let appending = false;
// One extra safety check per track (from the progress stream) — cleared on every
// track change so the check is at most twice per song, never once per second.
let progressCheckDone = false;

export function resetQueueLoopCheck(): void {
  progressCheckDone = false;
}

export function markProgressCheckDone(): void {
  progressCheckDone = true;
}

export function hasProgressCheckRun(): boolean {
  return progressCheckDone;
}

/**
 * If the active track is the LAST one in the player's queue, append another full
 * pass of the canonical queue (re-shuffled when shuffle is on, so every lap is a
 * fresh order). No-op in repeat 'one'/'all' — those loop natively.
 */
export async function ensureEndlessQueue(): Promise<void> {
  if (appending) return;
  appending = true;
  try {
    const { repeatMode, shuffleEnabled, originalQueue, queue } = usePlayerStore.getState();
    // 'one' repeats the track and 'all' loops the queue inside ExoPlayer; adding
    // a pass there would double the set the user asked to loop.
    if (repeatMode !== 'none') return;

    const base = originalQueue.length > 0 ? originalQueue : queue;
    if (base.length === 0) return;

    const index = await TrackPlayer.getActiveTrackIndex();
    if (index == null) return;
    const rntpQueue = await TrackPlayer.getQueue();
    // Something already follows — nothing to do yet.
    if (rntpQueue.length === 0 || index < rntpQueue.length - 1) return;

    const activeId = rntpQueue[index]?.id;
    const nextPass = nextOrder(base, shuffleEnabled, activeId);

    const audioService = TrackPlayerService.getInstance();
    await TrackPlayer.add(nextPass.map(s => audioService.songToTrack(s)));

    await pruneConsumedHistory(base.length);
  } catch {
    // Never let a queue-extension failure interrupt playback — the
    // PlaybackQueueEnded fallback still covers the hard stop.
  } finally {
    appending = false;
  }
}

// A fresh random order each lap; make sure the lap doesn't open with the very
// song that's playing right now (that reads as a stutter, not a new pass).
function nextOrder<T extends { id: string }>(
  base: T[], shuffleEnabled: boolean, activeId: unknown,
): T[] {
  if (!shuffleEnabled) return base;
  const order = shuffle(base);
  if (order.length > 1 && String(order[0]!.id) === String(activeId)) {
    const swapAt = 1 + Math.floor(Math.random() * (order.length - 1));
    [order[0], order[swapAt]] = [order[swapAt]!, order[0]!];
  }
  return order;
}

// Each lap appends a whole pass, so a long session would grow the native queue
// without bound. Once a full previous pass sits behind the active track, drop
// everything older than the history window. Runs at most once per lap.
async function pruneConsumedHistory(passLength: number): Promise<void> {
  const index = await TrackPlayer.getActiveTrackIndex();
  if (index == null || index <= passLength + HISTORY_KEEP) return;
  const cutoff = index - HISTORY_KEEP;
  await TrackPlayer.remove(Array.from({ length: cutoff }, (_, i) => i));
}
