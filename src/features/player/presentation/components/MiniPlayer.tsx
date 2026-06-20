import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { usePlayerControls, usePlayerProgress } from '../hooks/usePlayerControls';
import { useTheme } from '@/design-system/useTheme';

interface MiniPlayerProps {
  onExpand: () => void;
  onQueueOpen?: () => void;
}

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

export function MiniPlayer({ onExpand, onQueueOpen }: MiniPlayerProps) {
  const palette = useTheme();
  const activeTrack = useActiveTrack();
  const { isPlaying, togglePlayPause, skipToNext, skipToPrevious } = usePlayerControls();
  const { position, duration } = usePlayerProgress();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const progress = duration > 0 ? position / duration : 0;

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -60) runOnJS(skipToNext)();
      else if (e.translationX > 60) runOnJS(skipToPrevious)();
      translateX.value = withSpring(0);
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  if (!activeTrack) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[containerStyle, {
        marginHorizontal: 8,
        marginBottom: 6,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: palette.surface2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
      }]}>
        {/* Progress line */}
        <View style={{ height: 2, backgroundColor: palette.glass10 }}>
          <View style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: palette.accent,
          }} />
        </View>

        <Pressable
          onPress={onExpand}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Abrir reproductor. ${activeTrack.title} por ${activeTrack.artist}`}
        >
          <ExpoImage
            source={activeTrack.artwork ? { uri: activeTrack.artwork } : DEFAULT_ARTWORK}
            style={{ width: 44, height: 44, borderRadius: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
              {activeTrack.title}
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {activeTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={togglePlayPause}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={palette.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={skipToNext}
            style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Siguiente"
          >
            <Ionicons name="play-skip-forward" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          {onQueueOpen && (
            <TouchableOpacity
              onPress={onQueueOpen}
              style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Ver cola"
            >
              <Ionicons name="list" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
