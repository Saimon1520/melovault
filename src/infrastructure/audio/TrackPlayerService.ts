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
      // No maxCacheSize: every track is a local file, which RNTP never caches —
      // the option only created an unused on-disk cache (and disk writes on
      // phones with no free space).
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
        // Remove the media notification IMMEDIATELY when the user stops. RNTP
        // defaults this grace period to 5s, so the notification's "stop" button
        // appeared to "take forever" to dismiss. Our RNTP patch still keeps the
        // service in the foreground for a few seconds on any OTHER background
        // stop (seek, track gap, queue refill) — leaving it at once there is what
        // let Android kill the app mid-song.
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
    await FadeController.getInstance().reset();
    await this.loadTracks(songs.map(s => this.songToTrack(s)), startIndex, positionMs / 1000, async () => {
      await this.reapplyRepeatMode();
      await TrackPlayer.play();
    });
    this.assertPlaying();
  }

  // Rebuilds the queue around `songs[startIndex]` without ever emptying it and
  // without the chosen song ever being anything but the active track.
  //
  // The old reset() → add(all) → skip(index) made index 0 the active track for
  // a moment: it was announced to the mini player, the notification and
  // Bluetooth (the "first it shows the last song I downloaded" bug). And RNTP's
  // reset() is stop() → delay(300) → clear(): 300 ms of forced silence, during
  // which anything else sent to the player gets wiped by the late clear().
  //
  // Instead: load() swaps the chosen track in place of the active one (a single
  // track change, straight from the old song to the new one), the old queue
  // around it is dropped, the following tracks are appended, `beforeStart` runs
  // (play), and only then are the earlier tracks inserted in front — inserting
  // before the active item doesn't change it, so no second track change fires.
  async loadQueue(songs: Song[], startIndex: number, positionSec: number): Promise<void> {
    await this.loadTracks(songs.map(s => this.songToTrack(s)), startIndex, positionSec);
  }

  // Bumped by every load, so an older one still in flight knows it was superseded.
  private loadGeneration = 0;
  private loadingGeneration: number | null = null;
  // Set by the playback service: re-runs the end-of-queue check that was held
  // off while the queue was being rebuilt.
  onQueueLoaded: (() => void) | null = null;

  // True while a load is rebuilding the queue. The endless-queue check must not
  // look at it then: mid-rebuild the chosen song can briefly be the last track,
  // and appending a lap there would land it before the rest of the list.
  isLoadingQueue(): boolean {
    return this.loadingGeneration !== null;
  }

  private async loadTracks(
    tracks: Track[],
    startIndex: number,
    positionSec: number,
    beforeStart?: () => Promise<void>,
  ): Promise<void> {
    if (tracks.length === 0) return;
    const generation = ++this.loadGeneration;
    this.loadingGeneration = generation;
    const superseded = () => generation !== this.loadGeneration;
    try {
      const start = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      const chosen = tracks[start]!;
      // load() keeps playing if the old song was, so a song that resumes
      // mid-way would blip from 0:00 until the seek below — hold it first.
      if (positionSec > 0) await TrackPlayer.pause();
      // A newer load bumps the generation synchronously before sending anything
      // to the player, so checking right before each step guarantees this one
      // never mutates the queue after the newer one has started on it. Into an
      // empty player load() simply adds the track.
      await TrackPlayer.load(chosen);
      if (superseded()) return;
      await TrackPlayer.removeUpcomingTracks();
      const loadedAt = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
      if (superseded()) return;
      if (loadedAt > 0) await TrackPlayer.remove(Array.from({ length: loadedAt }, (_, i) => i));
      if (superseded()) return;
      if (start < tracks.length - 1) await TrackPlayer.add(tracks.slice(start + 1));
      if (superseded()) return;
      if (positionSec > 0) await TrackPlayer.seekTo(positionSec);
      if (beforeStart) await beforeStart();
      if (start === 0) return;
      // Something else replaced or cleared the queue meanwhile (another tap, the
      // notification's stop): inserting now would push these songs into a queue
      // that isn't ours — or start them in an empty one.
      const active = await TrackPlayer.getActiveTrack();
      if (superseded() || active?.id !== chosen.id) return;
      await TrackPlayer.add(tracks.slice(0, start), 0);
    } finally {
      if (this.loadingGeneration === generation) {
        this.loadingGeneration = null;
        this.onQueueLoaded?.();
      }
    }
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
