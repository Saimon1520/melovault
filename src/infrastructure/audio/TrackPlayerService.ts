import TrackPlayer, {
  State,
  RepeatMode as RNTPRepeatMode,
  Capability,
  AppKilledPlaybackBehavior,
  type Track,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FadeController } from '@/infrastructure/audio/FadeController';
import { usePlayerStore } from '@/features/player/store/playerStore';
import type { Song, RepeatMode, PlaybackSpeed } from '@/shared/types';

// Read persisted settings before the zustand store has hydrated (setup runs at
// startup). Returns defaults if anything is missing.
async function readAudioSettings(): Promise<{ playDuringMeetings: boolean; pauseOnInterruption: boolean }> {
  try {
    const raw = await AsyncStorage.getItem('@melovault/settings');
    const state = raw ? JSON.parse(raw)?.state : null;
    return {
      playDuringMeetings: !!state?.playDuringMeetings,
      // Default to pausing on interruption (notifications/calls) like Spotify.
      pauseOnInterruption: state?.interruptionMode !== 'duck',
    };
  } catch {
    return { playDuringMeetings: false, pauseOnInterruption: true };
  }
}

export class TrackPlayerService {
  private static instance: TrackPlayerService;

  static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  async setup(): Promise<void> {
    // When "play during meetings" is on we must NOT auto-handle interruptions,
    // because that maps to kotlinaudio's handleAudioFocus — keeping it off means
    // the player never yields focus, so music plays over calls/meetings.
    const { playDuringMeetings, pauseOnInterruption } = await readAudioSettings();

    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 5, // 5MB
      // autoHandleInterruptions: true → pause on headphone-disconnect and when
      // another app (call, alarm, meeting) takes audio focus. Disabled when the
      // user wants playback to continue over meetings.
      autoHandleInterruptions: !playDuringMeetings,
    });

    await TrackPlayer.updateOptions({
      android: {
        // Keep playback alive after app is killed from recents
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        // Fully pause (and resume) on a transient interruption like a
        // notification, instead of just ducking the volume — unless the user
        // chose "duck" in settings.
        alwaysPauseOnInterruption: pauseOnInterruption,
        // Remove the media notification IMMEDIATELY when playback stops. RNTP
        // defaults this grace period to 5s (it's meant to let an app auto-queue
        // related media after the queue ends), so the notification's "stop"
        // button appeared to "take forever" to dismiss. We never auto-queue, so
        // 0 = dismiss at once.
        stopForegroundGracePeriod: 0,
      },

      // Full set of capabilities — shown in:
      // • Android notification shade (expandable media notification)
      // • Android lock screen media controls
      // • Android Quick Settings media panel (the panel you swipe down)
      // • iOS Control Center
      // • iOS Lock Screen
      // • Bluetooth headset hardware buttons
      // • Android Wear / smartwatches
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],

      // Compact view (3 buttons max in collapsed notification and Quick Settings tile)
      compactCapabilities: [
        Capability.SkipToPrevious,
        Capability.Play,
        Capability.SkipToNext,
      ],

      // Progress bar in notification
      progressUpdateEventInterval: 1, // seconds
    });
  }

  songToTrack(song: Song): Track {
    return {
      id: song.id,
      url: song.filePath,
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      album: song.album || 'Unknown Album',
      artwork: song.artworkPath,
      duration: song.duration / 1000, // RNTP uses seconds
    };
  }

  async play(song: Song, positionMs = 0): Promise<void> {
    const track = this.songToTrack(song);
    // Snap volume back to the user's level: a crossfade fade-out from the
    // outgoing track could otherwise leave the new one momentarily silent,
    // which reads as "it didn't play".
    await FadeController.getInstance().reset();
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    await this.reapplyRepeatMode();
    if (positionMs > 0) {
      await TrackPlayer.seekTo(positionMs / 1000);
    }
    await TrackPlayer.play();
    this.assertPlaying();
  }

  // TrackPlayer.reset() clears the queue and resets the repeat mode to Off, so
  // the user's selected loop mode is lost whenever a new song/queue starts.
  // Re-push it from the store after each reset so the loop button actually sticks.
  private async reapplyRepeatMode(): Promise<void> {
    await this.setRepeatMode(usePlayerStore.getState().repeatMode);
  }

  async setQueue(songs: Song[], startIndex = 0, positionMs = 0): Promise<void> {
    const tracks = songs.map(s => this.songToTrack(s));
    await FadeController.getInstance().reset();
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    await this.reapplyRepeatMode();
    // skip(index, initialTime) moves to the start track AND seeks in one native
    // call. Skipping to index 0 is a no-op move, so only issue it when we
    // actually need to change index or seek — a redundant skip(0) re-prepares
    // the source and can race the play() below (the old "tap twice to play" bug).
    if (startIndex > 0 || positionMs > 0) {
      await TrackPlayer.skip(startIndex, positionMs > 0 ? positionMs / 1000 : 0);
    }
    await TrackPlayer.play();
    this.assertPlaying();
  }

  // RNTP can occasionally drop the first play() issued right after reset()/add()
  // on slower devices — the command lands before ExoPlayer finishes preparing
  // the freshly-added source, so nothing starts and the user had to tap again.
  // Re-assert play once shortly after, but only if we're not already starting,
  // so this never fights a deliberate pause. Fire-and-forget: callers don't wait.
  private assertPlaying(): void {
    setTimeout(async () => {
      try {
        const { state } = await TrackPlayer.getPlaybackState();
        const starting =
          state === State.Playing ||
          state === State.Buffering ||
          state === State.Loading;
        if (!starting) await TrackPlayer.play();
      } catch {
        // ignore — best-effort safety net
      }
    }, 250);
  }

  // Replaces the tracks AFTER the current one without interrupting playback —
  // used to apply/undo shuffle while a song is already playing.
  async reorderUpcoming(upcomingSongs: Song[]): Promise<void> {
    await TrackPlayer.removeUpcomingTracks();
    if (upcomingSongs.length > 0) {
      await TrackPlayer.add(upcomingSongs.map(s => this.songToTrack(s)));
    }
  }

  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  async resume(): Promise<void> {
    // Make sure a prior fade-out didn't leave the volume parked at 0 — otherwise
    // playback resumes silently until the user switches tracks.
    await FadeController.getInstance().ensureAudible();
    await TrackPlayer.play();
  }

  // Append a song to the end of the current queue (does not change playback).
  async addToQueue(song: Song): Promise<void> {
    await TrackPlayer.add(this.songToTrack(song));
  }

  // Remove every (non-currently-playing) occurrence of a song from the live
  // queue — used when a song is removed from the playlist that's playing, so it
  // doesn't keep coming up. The active track is left alone to avoid cutting off
  // what's playing right now.
  async removeFromQueue(songId: string): Promise<void> {
    const queue = await TrackPlayer.getQueue();
    const activeIndex = await TrackPlayer.getActiveTrackIndex();
    const indices = queue
      .map((t, i) => (String(t.id) === songId ? i : -1))
      .filter(i => i >= 0 && i !== activeIndex);
    if (indices.length > 0) {
      await TrackPlayer.remove(indices);
    }
  }

  async stop(): Promise<void> {
    await TrackPlayer.stop();
  }

  async seekTo(positionMs: number): Promise<void> {
    await TrackPlayer.seekTo(positionMs / 1000);
  }

  async seekBy(secondsDelta: number): Promise<void> {
    await TrackPlayer.seekBy(secondsDelta);
  }

  async skipToNext(): Promise<void> {
    await TrackPlayer.skipToNext();
  }

  async skipToPrevious(): Promise<void> {
    await TrackPlayer.skipToPrevious();
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    const modeMap: Record<RepeatMode, RNTPRepeatMode> = {
      none: RNTPRepeatMode.Off,
      one: RNTPRepeatMode.Track,
      all: RNTPRepeatMode.Queue,
    };
    await TrackPlayer.setRepeatMode(modeMap[mode]);
  }

  async setVolume(volume: number): Promise<void> {
    await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
  }

  async setRate(speed: PlaybackSpeed): Promise<void> {
    await TrackPlayer.setRate(speed);
  }

  async getCurrentPosition(): Promise<number> {
    const position = await TrackPlayer.getPosition();
    return position * 1000; // convert to ms
  }

  async getState(): Promise<State> {
    return TrackPlayer.getState();
  }
}
