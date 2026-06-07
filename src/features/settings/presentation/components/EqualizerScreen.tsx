import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { palette } from '@/design-system/tokens/colors';
import type { EqualizerBand, EqualizerPreset } from '@/shared/types';

const DEFAULT_PRESETS: EqualizerPreset[] = [
  { id: 'flat', name: 'Normal', isDefault: true, bands: [0,0,0,0,0].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'bass', name: 'Bass Boost', isDefault: false, bands: [8,5,2,0,-1].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'rock', name: 'Rock', isDefault: false, bands: [5,3,0,3,5].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'pop', name: 'Pop', isDefault: false, bands: [-2,3,5,3,-1].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'jazz', name: 'Jazz', isDefault: false, bands: [3,2,0,2,4].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'classical', name: 'Clásica', isDefault: false, bands: [4,2,0,2,4].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
  { id: 'vocal', name: 'Vocal', isDefault: false, bands: [-2,0,4,4,2].map((g, i) => ({ frequency: [60,230,910,3600,14000][i]!, gain: g })) },
];

const BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];
const GAIN_MIN = -12;
const GAIN_MAX = 12;
const SLIDER_HEIGHT = 160;

function BandSlider({ band, onChange }: { band: EqualizerBand; onChange: (gain: number) => void }) {
  const gainToY = (g: number) => ((GAIN_MAX - g) / (GAIN_MAX - GAIN_MIN)) * SLIDER_HEIGHT;
  const position = useSharedValue(gainToY(band.gain));

  const gesture = Gesture.Pan()
    .onUpdate(e => {
      const newY = Math.max(0, Math.min(SLIDER_HEIGHT, position.value + e.changeY));
      position.value = newY;
      const gain = GAIN_MAX - (newY / SLIDER_HEIGHT) * (GAIN_MAX - GAIN_MIN);
      runOnJS(onChange)(Math.round(gain));
    });

  const thumbStyle = useAnimatedStyle(() => ({
    top: position.value - 12,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: SLIDER_HEIGHT - position.value,
    bottom: 0,
  }));

  return (
    <View style={{ alignItems: 'center', width: 44 }}>
      <Text style={{ color: palette.textMuted, fontSize: 11, marginBottom: 6, minHeight: 18 }}>
        {band.gain > 0 ? `+${band.gain}` : band.gain}
      </Text>
      <GestureDetector gesture={gesture}>
        <View style={{ width: 4, height: SLIDER_HEIGHT, backgroundColor: palette.surface3, borderRadius: 2, position: 'relative' }}>
          <Animated.View style={[fillStyle, { position: 'absolute', left: 0, right: 0, backgroundColor: palette.accent, borderRadius: 2 }]} />
          <Animated.View style={[thumbStyle, {
            position: 'absolute', left: -10, width: 24, height: 24,
            borderRadius: 12, backgroundColor: '#fff',
            shadowColor: palette.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
          }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

export function EqualizerScreen({ onClose }: { onClose: () => void }) {
  const [selectedPreset, setSelectedPreset] = useState('flat');
  const [bands, setBands] = useState<EqualizerBand[]>(DEFAULT_PRESETS[0]!.bands);

  const applyPreset = (preset: EqualizerPreset) => {
    setSelectedPreset(preset.id);
    setBands([...preset.bands]);
  };

  const updateBand = (index: number, gain: number) => {
    setBands(prev => prev.map((b, i) => i === index ? { ...b, gain } : b));
    setSelectedPreset('custom');
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 24 }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar ecualizador">
          <Ionicons name="chevron-down" size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: palette.textPrimary, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>Ecualizador</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
        {DEFAULT_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            onPress={() => applyPreset(preset)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: selectedPreset === preset.id ? palette.accentSoft : palette.surface2,
              borderWidth: 1, borderColor: selectedPreset === preset.id ? palette.accent : 'transparent',
            }}
            accessibilityRole="button" accessibilityLabel={preset.name}
          >
            <Text style={{ color: selectedPreset === preset.id ? palette.accent : palette.textSecondary, fontSize: 13, fontWeight: '500' }}>
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Gain legend left side */}
      <View style={{ paddingHorizontal: 24, marginBottom: 4 }}>
        <Text style={{ color: palette.textMuted, fontSize: 11, textAlign: 'right' }}>+12 dB</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 8 }}>
        {bands.map((band, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <BandSlider band={band} onChange={gain => updateBand(i, gain)} />
            <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 10 }}>{BAND_LABELS[i]}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, marginTop: 4 }}>
        <Text style={{ color: palette.textMuted, fontSize: 11, textAlign: 'right' }}>-12 dB</Text>
      </View>
    </View>
  );
}
