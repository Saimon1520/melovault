import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { palette } from '@/design-system/tokens/colors';
import type { RepeatMode } from '@/shared/types';

const REPEAT_ICONS: Record<RepeatMode, React.ComponentProps<typeof Ionicons>['name']> = {
  none: 'repeat',
  all: 'repeat',
  one: 'repeat-sharp',
};

function ControlButton({
  icon,
  onPress,
  size = 26,
  color = palette.textPrimary,
  active = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = async () => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 400 });
    setTimeout(() => { scale.value = withSpring(1, { damping: 10, stiffness: 400 }); }, 100);
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
        <Ionicons name={icon} size={size} color={active ? palette.accent : color} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export function PlayerControls() {
  const {
    isPlaying, shuffleEnabled, repeatMode,
    togglePlayPause, skipToNext, skipToPrevious,
    seekBackward, seekForward, toggleShuffle, cycleRepeat,
  } = usePlayerControls();

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

      {/* Shuffle & Repeat row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <ControlButton
          icon={shuffleEnabled ? 'shuffle' : 'shuffle-outline'}
          onPress={toggleShuffle}
          size={20}
          active={shuffleEnabled}
          color={palette.textMuted}
        />
        <ControlButton
          icon={REPEAT_ICONS[repeatMode]}
          onPress={cycleRepeat}
          size={20}
          active={repeatMode !== 'none'}
          color={palette.textMuted}
        />
      </View>
    </View>
  );
}
