import TrackPlayer, {
  Event,
  State,
  RepeatMode as RNTPRepeatMode,
  type Track,
} from 'react-native-track-player';
import type { Song, RepeatMode, PlaybackSpeed } from '@/shared/types';

export class TrackPlayerService {
  private static instance: TrackPlayerService;

  static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  async setup(): Promise<void> {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 5, // 5MB cache
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: 1, // ContinuePlayback
      },
      capabilities: [
        TrackPlayer.CAPABILITY_PLAY,
        TrackPlayer.CAPABILITY_PAUSE,
        TrackPlayer.CAPABILITY_STOP,
        TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
        TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
        TrackPlayer.CAPABILITY_SEEK_TO,
      ],
      compactCapabilities: [
        TrackPlayer.CAPABILITY_PLAY,
        TrackPlayer.CAPABILITY_PAUSE,
        TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
      ],
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

  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  async resume(): Promise<void> {
    await TrackPlayer.play();
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
