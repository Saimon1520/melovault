import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
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
import { usePlayerStore } from '@/features/player/store/playerStore';
import { useFavoritesStore } from '@/features/player/store/favoritesStore';

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

  const trackId = activeTrack?.id ? String(activeTrack.id) : undefined;
  const favoriteIds = useFavoritesStore(s => s.favoriteIds);
  const toggleFavorite = useFavoritesStore(s => s.toggleFavorite);
  const isFavorite = trackId ? favoriteIds.includes(trackId) : false;

  const translateY = useSharedValue(0);
  const artworkScale = useSharedValue(isPlaying ? 1 : 0.88);

  React.useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1 : 0.88, { damping: 20, stiffness: 150 });
  }, [isPlaying]);

  const dismissGesture = Gesture.Pan()
    // Only claim downward vertical drags so horizontal controls (volume,
    // progress) keep working.
    .activeOffsetY([18, 9999])
    .failOffsetX([-15, 15])
    .onUpdate(({ translationY: ty }) => {
      if (ty > 0) translateY.value = ty;
    })
    .onEnd(({ translationY: ty, velocityY }) => {
      if (ty > 120 || velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [0, 250], [1, 0.5], Extrapolation.CLAMP),
  }));

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  // Cap the artwork by screen height too, so on this layout the controls and
  // speed row always fit above the navigation bar.
  const { height: winH } = useWindowDimensions();
  const size = Math.min(artworkSize.normal, winH * 0.32);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[screenStyle, {
          flex: 1,
          backgroundColor: palette.surface0,
          paddingTop: insets.top,
          // Guard against devices that under-report the bottom inset so the
          // speed row never sits under the system navigation bar.
          paddingBottom: Math.max(insets.bottom, 24) + 12,
        }]}>
          <StatusBar barStyle="light-content" />

          {/* Swipe-to-dismiss is limited to the top area so it never steals
              taps from the playback controls below. */}
          <GestureDetector gesture={dismissGesture}>
            <View>
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
            </View>
          </GestureDetector>

          {/* Artwork */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
            <Animated.View style={[artworkStyle, {
              width: size, height: size, borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.7,
              shadowRadius: 30,
              elevation: 20,
            }]}>
              <ExpoImage
                source={activeTrack?.artwork ? { uri: activeTrack.artwork } : DEFAULT_ARTWORK}
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
            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => trackId && toggleFavorite(trackId)}
              disabled={!trackId}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? palette.accent : palette.textMuted} />
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
        </Animated.View>

      {/* Info modal (full metadata) */}
      <Modal visible={showInfo} animationType="fade" transparent onRequestClose={() => setShowInfo(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>Información</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {([
                ['Título', currentSong?.title ?? activeTrack?.title],
                ['Artista', currentSong?.artist ?? activeTrack?.artist],
                ['Álbum', currentSong?.album ?? activeTrack?.album],
                ['Año', currentSong?.year],
                ['Género', currentSong?.genre],
                ['Disquera', currentSong?.label],
                ['Compositor', currentSong?.composer],
                ['Duración', currentSong?.duration
                  ? `${Math.floor(currentSong.duration / 60000)}:${String(Math.floor((currentSong.duration % 60000) / 1000)).padStart(2, '0')}`
                  : null],
                ['Bitrate', currentSong?.bitRate ? `${currentSong.bitRate} kbps` : null],
                ['Sample rate', currentSong?.sampleRate ? `${currentSong.sampleRate} Hz` : null],
                ['Pista', currentSong?.trackNumber ? String(currentSong.trackNumber) : null],
                ['Archivo', currentSong?.filePath],
              ] as [string, string | undefined | null][])
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: palette.textMuted, fontSize: 13, marginRight: 12, flexShrink: 0 }}>{label}</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 13, flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
