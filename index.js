import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './src/infrastructure/audio/playbackService';

// Register the background playback service (runs in a separate JS thread)
TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);
