import TrackPlayer, { Event } from 'react-native-track-player';
import { savePositionOnTrackChange, savePositionNow } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
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
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
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
      await fade.fadeIn(crossfadeMs);
    } else {
      await fade.reset();
    }
  });

  // ── Crossfade: fade the current track out as it approaches its end ───────
  // (fires every `progressUpdateEventInterval` seconds). The next track is
  // faded back in by the track-changed handler above.
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
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
