import TrackPlayer, {
  State,
  RepeatMode as RNTPRepeatMode,
  Capability,
  AppKilledPlaybackBehavior,
  type Track,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    if (positionMs > 0) {
      await TrackPlayer.seekTo(positionMs / 1000);
    }
    await TrackPlayer.play();
  }

  async setQueue(songs: Song[], startIndex = 0, positionMs = 0): Promise<void> {
    const tracks = songs.map(s => this.songToTrack(s));
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    await TrackPlayer.skip(startIndex);
    if (positionMs > 0) {
      await TrackPlayer.seekTo(positionMs / 1000);
    }
    await TrackPlayer.play();
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
    await TrackPlayer.play();
  }

  // Append a song to the end of the current queue (does not change playback).
  async addToQueue(song: Song): Promise<void> {
    await TrackPlayer.add(this.songToTrack(song));
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
