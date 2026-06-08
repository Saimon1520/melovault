import './src/app/crashReporter'; // MUST be first — sets global error handler

// ── DIAGNOSTIC: load each module inside try/catch and log to logcat ──
// console.error is forwarded to logcat under tag ReactNativeJS, so we can
// pinpoint exactly which import throws "Exception in HostObject::get".
function diag(label, fn) {
  try {
    const m = fn();
    console.error('MELO_DIAG OK: ' + label);
    return m;
  } catch (e) {
    console.error('MELO_DIAG FAIL: ' + label + ' :: ' + (e && e.message ? e.message : String(e)) + ' :: ' + (e && e.stack ? e.stack : ''));
    throw e;
  }
}

const { registerRootComponent } = diag('expo', () => require('expo'));
const TrackPlayer = diag('react-native-track-player', () => require('react-native-track-player').default);
const App = diag('./App', () => require('./App').default);
const { PlaybackService } = diag('./playbackService', () => require('./src/infrastructure/audio/playbackService'));

diag('registerPlaybackService', () => TrackPlayer.registerPlaybackService(() => PlaybackService));
diag('registerRootComponent', () => registerRootComponent(App));
console.error('MELO_DIAG: index.js fully evaluated');
