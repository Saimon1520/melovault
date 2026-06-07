import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

export function SpeedControl() {
  const [speed, setSpeed] = useState(1.0);

  const applySpeed = async (s: number) => {
    setSpeed(s);
    await TrackPlayer.setRate(s);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: palette.textMuted, fontSize: 12, marginRight: 4 }}>Velocidad</Text>
      {SPEEDS.map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => applySpeed(s)}
          style={{
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
            backgroundColor: speed === s ? palette.accentSoft : palette.surface2,
            borderWidth: 1,
            borderColor: speed === s ? palette.accent : 'transparent',
          }}
          accessibilityRole="button" accessibilityLabel={`Velocidad ${s}x`}
        >
          <Text style={{ color: speed === s ? palette.accent : palette.textMuted, fontSize: 11, fontWeight: speed === s ? '700' : '400' }}>
            {s}x
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
