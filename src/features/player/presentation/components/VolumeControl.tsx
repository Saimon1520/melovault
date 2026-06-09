import React, { useEffect, useRef, useState } from 'react';
import { View, NativeModules } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';

const AudioControl: {
  getVolume(): Promise<number>;
  setVolume(value: number): void;
} | undefined = NativeModules.AudioControl;

const TRACK_WIDTH = 200;
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/**
 * Controls the device media volume (AudioManager STREAM_MUSIC) and reflects the
 * real value, including changes made with the hardware buttons.
 */
export function VolumeControl() {
  const [volume, setVolume] = useState(1);
  const thumbX = useSharedValue(TRACK_WIDTH);
  const [width, setWidth] = useState(TRACK_WIDTH);
  const dragging = useRef(false);

  const sync = (v: number) => {
    const c = clamp01(v);
    setVolume(c);
    if (!dragging.current) thumbX.value = c * (width || TRACK_WIDTH);
  };

  // Initial read + poll so hardware-button changes are reflected.
  useEffect(() => {
    let active = true;
    const read = () => { AudioControl?.getVolume().then(v => { if (active) sync(v); }).catch(() => {}); };
    read();
    const id = setInterval(() => { if (!dragging.current) read(); }, 1200);
    return () => { active = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const apply = (v: number) => {
    const c = clamp01(v);
    setVolume(c);
    AudioControl?.setVolume(c);
  };

  const setDragging = (d: boolean) => { dragging.current = d; };

  const gesture = Gesture.Pan()
    .activeOffsetX([-6, 6]) // claim horizontal drags so the close gesture ignores them
    .failOffsetY([-12, 12])
    .onBegin(() => { runOnJS(setDragging)(true); })
    .onUpdate(e => {
      'worklet';
      const w = width || TRACK_WIDTH;
      const x = Math.max(0, Math.min(w, e.x));
      thumbX.value = x;
      runOnJS(apply)(x / w);
    })
    .onFinalize(() => { runOnJS(setDragging)(false); });

  const fillStyle = useAnimatedStyle(() => ({ width: thumbX.value }));
  const thumbStyle = useAnimatedStyle(() => ({ left: thumbX.value - 9 }));

  const icon = volume === 0 ? 'volume-mute' : volume < 0.4 ? 'volume-low' : volume < 0.8 ? 'volume-medium' : 'volume-high';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={18} color={palette.textMuted} />
      <GestureDetector gesture={gesture}>
        <View
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
          style={{ flex: 1, height: 28, justifyContent: 'center' }}
        >
          <View style={{ height: 4, backgroundColor: palette.surface3, borderRadius: 2 }}>
            <Animated.View style={[fillStyle, { height: 4, backgroundColor: palette.textSecondary, borderRadius: 2 }]} />
          </View>
          <Animated.View style={[thumbStyle, {
            position: 'absolute', top: 5, width: 18, height: 18,
            borderRadius: 9, backgroundColor: '#fff', elevation: 3,
          }]} />
        </View>
      </GestureDetector>
    </View>
  );
}
