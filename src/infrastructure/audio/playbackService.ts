import TrackPlayer, { Event } from 'react-native-track-player';
import { savePositionOnTrackChange } from '@/features/player/domain/usecases/PositionPersistenceUseCase';

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

  // ── Headphone / audio device disconnect ──────────────────────────────────
  // Triggered when:
  //   • Wired headphones are unplugged (Android ACTION_AUDIO_BECOMING_NOISY)
  //   • Bluetooth headphones disconnect
  //   • Another app requests audio focus (phone call, alarm, etc.)
  // autoHandleInterruptions=true in setupPlayer handles most of this,
  // but we add explicit pause here for Bluetooth disconnect edge cases.
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      // Another app permanently took audio (phone call ended, etc.) — stop
      await TrackPlayer.stop();
    } else if (event.paused) {
      // Temporary interruption OR headphone disconnect — pause
      await TrackPlayer.pause();
    } else {
      // Interruption ended — resume (only if we were playing before)
      await TrackPlayer.play();
    }
  });

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

  // ── Save position when track changes ─────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
    await savePositionOnTrackChange();
  });

  // ── Track end — advance queue ─────────────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await savePositionOnTrackChange();
    await TrackPlayer.stop();
  });
}
