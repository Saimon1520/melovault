import TrackPlayer, { Event, State } from 'react-native-track-player';
import { savePositionOnTrackChange, savePositionNow, skipNextTrackChangeSave, recordLivePosition, markPlaybackNotPlaying, getLivePositionSec } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
import { FadeController } from '@/infrastructure/audio/FadeController';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { shuffle } from '@/shared/utils/shuffle';
import {
  ensureEndlessQueue, resetQueueLoopCheck, markProgressCheckDone, hasProgressCheckRun,
} from '@/infrastructure/audio/queueLoop';

const fade = FadeController.getInstance();
const songRepo = new SongRepository();
const audioService = TrackPlayerService.getInstance();

// Runs in a dedicated JS thread for background audio playback.
// Registered in index.js via TrackPlayer.registerPlaybackService()
export async function PlaybackService() {
  // ── Notification / hardware button controls ──────────────────────────────
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  // The notification "stop" (square) button. The native STOP action only emits
  // this event (MediaSessionCallback.STOP → BUTTON_STOP); it does NOT mutate the
  // player, so the active track is still the real one here — we save the EXACT
  // current position (the song keeps advancing in the background after the app
  // is hidden, so the earlier background force-save can be a few seconds stale).
  // Then suppress reset()'s own track-change save (its lastPosition is stale and
  // would clobber what we just saved) and reset() to dismiss the notification
  // immediately (grace=0). reset() empties the player; the session is reloaded
  // from the saved state when the app next foregrounds (Providers' 'active').
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    const hadTrack = (await TrackPlayer.getActiveTrack())?.id != null;
    // getPosition() is already 0 here (STOP reset the native player), so persist
    // the last live position from the progress stream instead — that's the exact
    // second the user was at.
    await savePositionNow(true, getLivePositionSec());
    if (hadTrack) skipNextTrackChangeSave();
    await TrackPlayer.reset();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));

  // Audio interruptions (notifications, calls, headphone unplug) are handled
  // natively via setupPlayer's autoHandleInterruptions + alwaysPauseOnInterruption
  // (pause/duck + auto-resume), so we deliberately don't handle RemoteDuck here —
  // doing both caused conflicting pause/resume.

  // ── Playback error recovery ───────────────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
    console.error('[Playback] Error:', error.message);
    // Try to skip to next track on error instead of silently stopping
    try {
      await TrackPlayer.skipToNext();
    } catch {
      await TrackPlayer.stop();
    }
  });

  // ── Save position + fade the new track in ────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    await savePositionOnTrackChange(event);
    // Keep the store's current song in sync with whatever is actually playing
    // (queue auto-advance, remote next/prev…) so the player UI + "…" menu act on
    // the right song.
    try {
      const newId = event.track?.id ?? (await TrackPlayer.getActiveTrack())?.id;
      if (newId != null) {
        const song = await songRepo.getById(String(newId));
        if (song) usePlayerStore.getState().setCurrentSong(song);
      }
    } catch { /* ignore */ }
    const crossfadeMs = useSettingsStore.getState().crossfadeMs;
    if (crossfadeMs > 0) {
      // RNTP drives a single ExoPlayer, so two tracks can't truly overlap. The
      // outgoing track already faded down over the full crossfade window; bring
      // the incoming one up quickly so it's audible right away instead of
      // leaving a long, "stopped"-sounding quiet gap on a big crossfade value.
      await fade.fadeIn(Math.min(crossfadeMs, 2500));
    } else {
      await fade.reset();
    }

    // Landed on the last track of the queue? Queue up the next lap NOW, while
    // the service is still comfortably in the foreground, so playback never
    // reaches a hard stop. See queueLoop.ts for why waiting for the end fails.
    resetQueueLoopCheck();
    await ensureEndlessQueue();
  });

  // ── Save the position the moment playback pauses ─────────────────────────
  // The interval + progress event only persist while PLAYING, so without this a
  // pause (then app close) would lose the last few seconds before the pause.
  TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
    if (e.state === State.Paused) savePositionNow(true);
    // Stop extrapolating the live position once playback isn't advancing.
    if (e.state !== State.Playing) markPlaybackNotPlaying();
  });

  // ── Crossfade: fade the current track out as it approaches its end ───────
  // (fires every `progressUpdateEventInterval` seconds). The next track is
  // faded back in by the track-changed handler above.
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (e) => {
    // Remember the live position every tick (cheap, in-memory) so the "stop"
    // button can persist the exact second even though getPosition() is 0 by then.
    recordLivePosition(e.position);
    // Persist the position from here too: this event keeps firing while the app
    // is in the background (the playback service stays alive), so the saved
    // position tracks the real playback closely (throttled internally).
    savePositionNow();

    // Second (and last) chance to extend the queue for this track, in case the
    // track-change check ran before the store's queue was populated. Guarded so
    // it costs one native queue read per song, not one per second.
    if (!hasProgressCheckRun() && e.duration > 0 && e.duration - e.position <= 20) {
      markProgressCheckDone();
      ensureEndlessQueue();
    }

    const crossfadeMs = useSettingsStore.getState().crossfadeMs;
    if (crossfadeMs <= 0 || !e.duration) return;
    const remainingMs = (e.duration - e.position) * 1000;
    if (remainingMs > 0 && remainingMs <= crossfadeMs && !fade.isFadingOut()) {
      // Only crossfade when another track actually follows. Fading out the LAST
      // track just leaves the player muted, so the next manual play of that song
      // (which doesn't go through reset()/fade.reset()) would be silent.
      const queue = await TrackPlayer.getQueue();
      const idx = await TrackPlayer.getActiveTrackIndex();
      const hasNext = idx != null && idx < queue.length - 1;
      if (hasNext) fade.fadeOut(remainingMs);
    }
  });

  // ── Queue end — FALLBACK loop ─────────────────────────────────────────────
  // Normally unreachable: queueLoop.ts appends the next lap before the last
  // track finishes, so the queue never actually ends. This stays as a safety net
  // for the cases where that append couldn't run (store not populated yet, a
  // native add() that failed…), rebuilding the set from scratch instead of
  // stopping. It only fires in RepeatMode.Off ('none') — RepeatMode.Track/'one'
  // and RepeatMode.Queue/'all' loop natively and never emit this event.
  //
  // It appends + skips instead of reset()ing: this usually runs in the
  // background, and reset() drops the player to IDLE, which is exactly the kind
  // of stop that takes the service out of the foreground.
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await savePositionOnTrackChange();

    try {
      const { shuffleEnabled, originalQueue, queue, queueContextId, setQueue } =
        usePlayerStore.getState();
      const base = originalQueue.length > 0 ? originalQueue : queue;
      if (base.length === 0) {
        // No queue known to the store (e.g. a lone song loaded some other way):
        // start the player's own queue over rather than going silent.
        if ((await TrackPlayer.getQueue()).length === 0) return;
        await TrackPlayer.skip(0, 0);
        await TrackPlayer.play();
        return;
      }

      const nextOrder = shuffleEnabled ? shuffle(base) : base;
      // Suppress the track-change save with the stale end-of-queue position, so
      // it can't clobber the per-song resume points.
      skipNextTrackChangeSave();
      setQueue(nextOrder, 0, base, queueContextId);
      const startIndex = (await TrackPlayer.getQueue()).length;
      await TrackPlayer.add(nextOrder.map(s => audioService.songToTrack(s)));
      await TrackPlayer.skip(startIndex, 0);
      await TrackPlayer.play();
    } catch {
      // Last resort: rebuild from scratch (reset + add + play).
      const { originalQueue, queue } = usePlayerStore.getState();
      const base = originalQueue.length > 0 ? originalQueue : queue;
      if (base.length > 0) await audioService.setQueue(base, 0, 0);
    }
  });
}
