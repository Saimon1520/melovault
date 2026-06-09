import './src/app/crashReporter'; // MUST be first — sets global error handler

import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/infrastructure/audio/playbackService';

TrackPlayer.registerPlaybackService(() => PlaybackService);
registerRootComponent(App);
