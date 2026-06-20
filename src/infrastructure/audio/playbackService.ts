import TrackPlayer, { Event, State } from 'react-native-track-player';
import { savePositionOnTrackChange, savePositionNow, skipNextTrackChangeSave, recordLivePosition, markPlaybackNotPlaying, getLivePositionSec } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
import { FadeController } from '@/infrastructure/audio/FadeController';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';

const fade = FadeController.getInstance();
const songRepo = new SongRepository();

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
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    // Remember the live position every tick (cheap, in-memory) so the "stop"
    // button can persist the exact second even though getPosition() is 0 by then.
    recordLivePosition(e.position);
    // Persist the position from here too: this event keeps firing while the app
    // is in the background (the playback service stays alive), so the saved
    // position tracks the real playback closely (throttled internally).
    savePositionNow();

    const crossfadeMs = useSettingsStore.getState().crossfadeMs;
    if (crossfadeMs <= 0 || !e.duration) return;
    const remainingMs = (e.duration - e.position) * 1000;
    if (remainingMs > 0 && remainingMs <= crossfadeMs && !fade.isFadingOut()) {
      fade.fadeOut(remainingMs);
    }
  });

  // ── Track end — advance queue ─────────────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await savePositionOnTrackChange();
    await TrackPlayer.stop();
  });
}
