import TrackPlayer, { Event } from 'react-native-track-player';

// This service runs in a separate JS thread for background playback
// Registered via TrackPlayer.registerPlaybackService() in index.js
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      await TrackPlayer.stop();
    } else if (event.paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });
}
