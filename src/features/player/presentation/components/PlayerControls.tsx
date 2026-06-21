import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, runOnJS, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { useTheme } from '@/design-system/useTheme';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import type { RepeatMode } from '@/shared/types';

const REPEAT_ICONS: Record<RepeatMode, React.ComponentProps<typeof Ionicons>['name']> = {
  none: 'repeat',
  all: 'repeat',
  one: 'repeat-sharp',
};

// Tiny explanatory bubbles shown above the shuffle/repeat buttons when toggled,
// so the two repeat modes (whole list vs. single song) aren't a mystery.
const REPEAT_HINTS: Record<RepeatMode, { title: string; desc: string }> = {
  none: { title: 'Repetir desactivado', desc: 'Al terminar la lista, la reproducción se detiene.' },
  all: { title: 'Repetir lista', desc: 'Al acabar la última canción, vuelve a la primera.' },
  one: { title: 'Repetir canción', desc: 'Repite una y otra vez solo la canción actual.' },
};

interface Hint { title: string; desc: string; side: 'left' | 'right'; }

function ControlButton({
  icon,
  onPress,
  size = 26,
  color,
  active = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const palette = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = async () => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 400 });
    scale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 400 }));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      style={{ padding: 8 }}
    >
      <Animated.View style={animStyle}>
        <Ionicons name={icon} size={size} color={active ? palette.accent : (color ?? palette.textPrimary)} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function HintBubble({ hint, opacity, palette }: { hint: Hint; opacity: SharedValue<number>; palette: ReturnType<typeof useTheme> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[style, {
        position: 'absolute', bottom: '100%', marginBottom: 8, width: 220,
        ...(hint.side === 'right' ? { right: 0 } : { left: 0 }),
        backgroundColor: palette.surface3, borderRadius: 12, overflow: 'hidden',
        paddingHorizontal: 12, paddingVertical: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
      }]}
    >
      {/* flexShrink + flexWrap so long text wraps INSIDE the bubble instead of
          spilling past the rounded background. */}
      <Text style={{ color: palette.textPrimary, fontSize: 12, fontWeight: '700', flexShrink: 1, flexWrap: 'wrap' }}>{hint.title}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15, flexShrink: 1, flexWrap: 'wrap' }}>{hint.desc}</Text>
    </Animated.View>
  );
}

export function PlayerControls() {
  const palette = useTheme();
  const {
    isPlaying, shuffleEnabled, repeatMode,
    togglePlayPause, skipToNext, skipToPrevious,
    seekBackward, seekForward, toggleShuffle, cycleRepeat,
  } = usePlayerControls();

  // Auto-hiding explanatory bubble for the shuffle/repeat buttons.
  const [hint, setHint] = useState<Hint | null>(null);
  const hintOpacity = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const flashHint = useCallback((next: Hint) => {
    if (!useSettingsStore.getState().showControlHints) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHint(next);
    hintOpacity.value = withTiming(1, { duration: 140 });
    hideTimer.current = setTimeout(() => {
      hintOpacity.value = withTiming(0, { duration: 280 }, (finished) => {
        if (finished) runOnJS(setHint)(null);
      });
    }, 2600);
  }, [hintOpacity]);

  const onShuffle = useCallback(() => {
    const next = !shuffleEnabled;
    toggleShuffle();
    flashHint(next
      ? { title: 'Aleatorio activado', desc: 'Reproduce las canciones en orden aleatorio.', side: 'left' }
      : { title: 'Aleatorio desactivado', desc: 'Vuelve al orden original de la lista.', side: 'left' });
  }, [shuffleEnabled, toggleShuffle, flashHint]);

  const onRepeat = useCallback(() => {
    const next: RepeatMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
    cycleRepeat();
    flashHint({ ...REPEAT_HINTS[next], side: 'right' });
  }, [repeatMode, cycleRepeat, flashHint]);

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      {/* Main controls row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        marginBottom: 16,
      }}>
        <ControlButton icon="play-skip-back" onPress={skipToPrevious} size={28} color={palette.textSecondary} />
        <ControlButton icon="play-back" onPress={seekBackward} size={24} color={palette.textSecondary} />

        {/* Play/Pause — larger with accent bg */}
        <TouchableOpacity
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            togglePlayPause();
          }}
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={30}
            color="#fff"
            style={{ marginLeft: isPlaying ? 0 : 3 }}
          />
        </TouchableOpacity>

        <ControlButton icon="play-forward" onPress={seekForward} size={24} color={palette.textSecondary} />
        <ControlButton icon="play-skip-forward" onPress={skipToNext} size={28} color={palette.textSecondary} />
      </View>

      {/* Shuffle & Repeat row — `relative` so the hint bubble can sit above it */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, position: 'relative' }}>
        {hint && <HintBubble hint={hint} opacity={hintOpacity} palette={palette} />}
        <ControlButton
          icon={shuffleEnabled ? 'shuffle' : 'shuffle-outline'}
          onPress={onShuffle}
          size={20}
          active={shuffleEnabled}
          color={palette.textMuted}
        />
        <ControlButton
          icon={REPEAT_ICONS[repeatMode]}
          onPress={onRepeat}
          size={20}
          active={repeatMode !== 'none'}
          color={palette.textMuted}
        />
      </View>
    </View>
  );
}
