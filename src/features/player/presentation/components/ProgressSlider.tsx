import React from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { usePlayerProgress } from '../hooks/usePlayerControls';
import { savePositionNow } from '@/features/player/domain/usecases/PositionPersistenceUseCase';
import { formatTime } from '@/shared/utils/formatTime';
import { useTheme } from '@/design-system/useTheme';

export function ProgressSlider() {
  const palette = useTheme();
  const { position, duration } = usePlayerProgress();
  const sliderWidth = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const isSeeking = useSharedValue(false);
  const seekProgress = useSharedValue(0);

  // SharedValue that worklets can safely read — avoids stale JS closure capture
  const progressSV = useDerivedValue(() => (duration > 0 ? position / duration : 0));

  // Seek, then keep the thumb pinned at the target until useProgress (which
  // updates ~every 250ms) catches up — otherwise the thumb appears not to move
  // until the next tick (felt like needing a second tap).
  const seekToAndHold = async (pos: number) => {
    if (duration > 0) {
      const targetSec = pos * duration;
      await TrackPlayer.seekTo(targetSec);
      // Persist the seeked position right away — this is the only save that
      // happens while PAUSED (the interval + progress event only fire while
      // playing), so a paused seek + close would otherwise be lost.
      savePositionNow(true, targetSec);
    }
    setTimeout(() => { isSeeking.value = false; }, 400);
  };

  const pan = Gesture.Pan()
    // Claim horizontal drags so the surrounding vertical ScrollView doesn't
    // steal the seek gesture.
    .activeOffsetX([-8, 8])
    .failOffsetY([-18, 18])
    .onBegin(() => {
      thumbScale.value = withSpring(1.5, { damping: 15, stiffness: 300 });
      isSeeking.value = true;
      seekProgress.value = progressSV.value;
    })
    .onUpdate((e) => {
      if (sliderWidth.value > 0) {
        seekProgress.value = Math.max(0, Math.min(1, e.x / sliderWidth.value));
      }
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      runOnJS(seekToAndHold)(seekProgress.value);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    if (sliderWidth.value > 0) {
      const pos = Math.max(0, Math.min(1, e.x / sliderWidth.value));
      // Jump the thumb immediately so a single tap feels responsive.
      seekProgress.value = pos;
      isSeeking.value = true;
      runOnJS(seekToAndHold)(pos);
    }
  });

  const combined = Gesture.Race(pan, tap);

  const barStyle = useAnimatedStyle(() => {
    const p = isSeeking.value ? seekProgress.value : progressSV.value;
    return { width: `${p * 100}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const p = isSeeking.value ? seekProgress.value : progressSV.value;
    return {
      transform: [{ scale: thumbScale.value }],
      left: `${p * 100}%`,
      marginLeft: -8,
    };
  });

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
      <GestureDetector gesture={combined}>
        <View
          style={{ height: 40, justifyContent: 'center' }}
          onLayout={(e) => { sliderWidth.value = e.nativeEvent.layout.width; }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Progreso: ${formatTime(position * 1000)} de ${formatTime(duration * 1000)}`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round((duration > 0 ? position / duration : 0) * 100) }}
        >
          <View style={{ height: 4, borderRadius: 2, backgroundColor: palette.glass20, overflow: 'visible' }}>
            <Animated.View style={[barStyle, { height: '100%', backgroundColor: palette.accent, borderRadius: 2 }]} />
          </View>
          <Animated.View style={[thumbStyle, {
            position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff',
            shadowColor: palette.accent, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
          }]} />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          {formatTime(position * 1000)}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          {formatTime(duration * 1000)}
        </Text>
      </View>
    </View>
  );
}
