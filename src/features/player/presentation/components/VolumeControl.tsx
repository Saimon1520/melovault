import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';

const TRACK_WIDTH = 220;

export function VolumeControl() {
  const [volume, setVolume] = useState(1);
  const thumbX = useSharedValue(TRACK_WIDTH);

  const setVol = async (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    await TrackPlayer.setVolume(clamped);
  };

  const gesture = Gesture.Pan()
    .onUpdate(e => {
      const newX = Math.max(0, Math.min(TRACK_WIDTH, thumbX.value + e.changeX));
      thumbX.value = newX;
      runOnJS(setVol)(newX / TRACK_WIDTH);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: thumbX.value }));
  const thumbStyle = useAnimatedStyle(() => ({ left: thumbX.value - 10 }));

  const icon = volume === 0 ? 'volume-mute' : volume < 0.4 ? 'volume-low' : volume < 0.8 ? 'volume-medium' : 'volume-high';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={16} color={palette.textMuted} />
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1, height: 4, backgroundColor: palette.surface3, borderRadius: 2, position: 'relative', maxWidth: TRACK_WIDTH }}>
          <Animated.View style={[fillStyle, { height: 4, backgroundColor: palette.textSecondary, borderRadius: 2 }]} />
          <Animated.View style={[thumbStyle, {
            position: 'absolute', top: -8, width: 20, height: 20,
            borderRadius: 10, backgroundColor: '#fff', elevation: 2,
          }]} />
        </View>
      </GestureDetector>
      <Ionicons name="volume-high" size={16} color={palette.textMuted} />
    </View>
  );
}
