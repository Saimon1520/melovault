import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, Modal } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  useAnimatedGestureHandler, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/design-system/tokens/colors';
import { artworkSize } from '@/design-system/tokens/breakpoints';
import { ProgressSlider } from '../components/ProgressSlider';
import { PlayerControls } from '../components/PlayerControls';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { BluetoothModal } from '@/features/bluetooth/presentation/components/BluetoothModal';
import { EqualizerScreen } from '@/features/settings/presentation/components/EqualizerScreen';
import { LyricsScreen } from '@/features/lyrics/presentation/screens/LyricsScreen';
import { SongOptionsModal } from '../components/SongOptionsModal';
import { VolumeControl } from '../components/VolumeControl';
import { SpeedControl } from '../components/SpeedControl';
import { usePlayerStore } from '../store/playerStore';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface NowPlayingScreenProps {
  onClose: () => void;
  songId?: string;
}

export function NowPlayingScreen({ onClose, songId }: NowPlayingScreenProps) {
  const insets = useSafeAreaInsets();
  const activeTrack = useActiveTrack();
  const { isPlaying } = usePlayerControls();
  const { currentSong } = usePlayerStore();

  const [showLyrics, setShowLyrics] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showBluetooth, setShowBluetooth] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const translateY = useSharedValue(0);
  const artworkScale = useSharedValue(isPlaying ? 1 : 0.88);

  React.useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1 : 0.88, { damping: 20, stiffness: 150 });
  }, [isPlaying]);

  const dismissGesture = useAnimatedGestureHandler({
    onActive: ({ translationY: ty }) => {
      if (ty > 0) translateY.value = ty;
    },
    onEnd: ({ translationY: ty, velocityY }) => {
      if (ty > 120 || velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    },
  });

  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [0, 250], [1, 0.5], Extrapolation.CLAMP),
  }));

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  const size = artworkSize.normal;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={dismissGesture}>
        <Animated.View style={[screenStyle, {
          flex: 1,
          backgroundColor: palette.surface0,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 8,
        }]}>
          <StatusBar barStyle="light-content" />

          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="chevron-down" size={26} color={palette.textSecondary} />
            </TouchableOpacity>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
              REPRODUCIENDO
            </Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity
                onPress={() => setShowSleepTimer(v => !v)}
                style={{ padding: 4 }}
                accessibilityRole="button" accessibilityLabel="Sleep timer"
              >
                <Ionicons name="moon-outline" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowOptions(true)}
                style={{ padding: 4 }}
                accessibilityRole="button" accessibilityLabel="Más opciones"
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Artwork */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Animated.View style={[artworkStyle, {
              width: size, height: size, borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.7,
              shadowRadius: 30,
              elevation: 20,
            }]}>
              <FastImage
                source={activeTrack?.artwork ? { uri: activeTrack.artwork, cache: FastImage.cacheControl.immutable } : DEFAULT_ARTWORK}
                style={{ width: size, height: size, borderRadius: 20 }}
                accessibilityLabel={`Portada de ${activeTrack?.album ?? 'álbum desconocido'}`}
              />
            </Animated.View>
          </View>

          {/* Song info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 4 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: '700' }} numberOfLines={1}>
                {activeTrack?.title ?? 'Sin título'}
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: 16, marginTop: 2 }} numberOfLines={1}>
                {activeTrack?.artist ?? 'Artista desconocido'}
              </Text>
            </View>
            <TouchableOpacity style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Me gusta">
              <Ionicons name="heart-outline" size={24} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Quick toggles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginBottom: 8 }}>
            {[
              { key: 'lyrics', label: 'Letras', icon: 'text-outline' as const, active: showLyrics, onPress: () => setShowLyrics(v => !v) },
              { key: 'info', label: 'Info', icon: 'information-circle-outline' as const, active: showInfo, onPress: () => setShowInfo(v => !v) },
              { key: 'eq', label: 'EQ', icon: 'options-outline' as const, active: false, onPress: () => setShowEqualizer(true) },
              { key: 'bt', label: 'Bluetooth', icon: 'bluetooth' as const, active: false, onPress: () => setShowBluetooth(true) },
            ].map(({ key, label, icon, active, onPress }) => (
              <TouchableOpacity
                key={key}
                onPress={onPress}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: active ? palette.accentSoft : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: active ? palette.accent : 'transparent',
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <Ionicons name={icon} size={13} color={active ? palette.accent : palette.textMuted} />
                <Text style={{ color: active ? palette.accent : palette.textMuted, fontSize: 12, fontWeight: '500' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress */}
          <ProgressSlider />

          {/* Controls */}
          <PlayerControls />

          {/* Volume + Speed row */}
          <View style={{ paddingHorizontal: 24, marginTop: 8, gap: 10 }}>
            <VolumeControl />
            <SpeedControl />
          </View>

          {/* Info panel */}
          {showInfo && activeTrack && (
            <ScrollView style={{ maxHeight: 140, marginHorizontal: 20, marginTop: 8, backgroundColor: palette.surface2, borderRadius: 16 }}>
              <View style={{ padding: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
                  INFORMACIÓN
                </Text>
                {[
                  ['Álbum', activeTrack.album],
                  ['Artista', activeTrack.artist],
                  ['Duración', activeTrack.duration ? `${Math.floor(activeTrack.duration / 60)}:${String(Math.floor(activeTrack.duration % 60)).padStart(2, '0')}` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: palette.textMuted, fontSize: 13 }}>{label}</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 13, maxWidth: '60%', textAlign: 'right' }} numberOfLines={1}>{value}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </PanGestureHandler>

      {/* Sleep Timer — renders badge + modal */}
      <SleepTimerModal visible={showSleepTimer} onClose={() => setShowSleepTimer(false)} />

      {/* Bluetooth device picker */}
      <BluetoothModal visible={showBluetooth} onClose={() => setShowBluetooth(false)} />

      {/* Equalizer full screen modal */}
      <Modal visible={showEqualizer} animationType="slide" onRequestClose={() => setShowEqualizer(false)}>
        <EqualizerScreen onClose={() => setShowEqualizer(false)} />
      </Modal>

      {/* Lyrics full screen modal */}
      <Modal visible={showLyrics} animationType="slide" onRequestClose={() => setShowLyrics(false)}>
        <LyricsScreen songId={songId} onClose={() => setShowLyrics(false)} />
      </Modal>

      {/* Song options modal (via "…" button) */}
      <SongOptionsModal
        song={currentSong}
        visible={showOptions}
        onClose={() => setShowOptions(false)}
      />
    </GestureHandlerRootView>
  );
}
