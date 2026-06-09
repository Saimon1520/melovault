import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { palette } from '@/design-system/tokens/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsivePane } from '@/shared/components/ResponsivePane';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import type { EqualizerBand, EqualizerPreset } from '@/shared/types';

// Native 5-band equalizer (android.media.audiofx.Equalizer) bound to the
// ExoPlayer audio session. Available only after audio has started playing.
const AudioControl: {
  getEqualizer(): Promise<{ available: boolean; enabled?: boolean; currentLevels?: number[] }>;
  setEqEnabled(enabled: boolean): void;
  setBandLevel(band: number, millibels: number): void;
  setGains(values: number[]): void;
} | undefined = NativeModules.AudioControl;

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
  const insets = useSafeAreaInsets();
  const {
    persistEqualizer, setPersistEqualizer, setEqualizerState,
    equalizerEnabled, equalizerPreset, equalizerGains,
  } = useSettingsStore();

  const [selectedPreset, setSelectedPreset] = useState(persistEqualizer ? equalizerPreset : 'flat');
  const [bands, setBands] = useState<EqualizerBand[]>(
    persistEqualizer && equalizerGains.length === 5
      ? DEFAULT_PRESETS[0]!.bands.map((b, i) => ({ ...b, gain: equalizerGains[i] ?? 0 }))
      : DEFAULT_PRESETS[0]!.bands,
  );
  const [enabled, setEnabled] = useState(persistEqualizer ? equalizerEnabled : false);
  const [available, setAvailable] = useState(true);

  // Persist the current EQ state when the user opted in.
  const save = useCallback((nextEnabled: boolean, preset: string, nextBands: EqualizerBand[]) => {
    if (useSettingsStore.getState().persistEqualizer) {
      setEqualizerState({ enabled: nextEnabled, preset, gains: nextBands.map(b => b.gain) });
    }
  }, [setEqualizerState]);

  const pushGains = useCallback((nextBands: EqualizerBand[]) => {
    AudioControl?.setGains(nextBands.map(b => Math.round(b.gain * 100))); // dB → millibels
  }, []);

  // Sync UI/native with either the saved state (if persisting) or the live
  // native equalizer state when the screen opens.
  useEffect(() => {
    let cancelled = false;
    AudioControl?.getEqualizer().then(info => {
      if (cancelled) return;
      setAvailable(!!info.available);
      if (!info.available) return;
      if (persistEqualizer) {
        // Re-apply the remembered settings to the native equalizer.
        AudioControl?.setEqEnabled(enabled);
        if (enabled) pushGains(bands);
      } else if (info.currentLevels && info.currentLevels.length === bands.length) {
        setBands(prev => prev.map((b, i) => ({ ...b, gain: Math.round((info.currentLevels![i] ?? 0) / 100) })));
        setEnabled(!!info.enabled);
      }
    }).catch(() => setAvailable(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    AudioControl?.setEqEnabled(value);
    if (value) pushGains(bands);
    save(value, selectedPreset, bands);
  }, [bands, pushGains, save, selectedPreset]);

  const applyPreset = (preset: EqualizerPreset) => {
    setSelectedPreset(preset.id);
    const next = preset.bands.map(b => ({ ...b }));
    setBands(next);
    if (!enabled) { setEnabled(true); AudioControl?.setEqEnabled(true); }
    pushGains(next);
    save(true, preset.id, next);
  };

  const updateBand = (index: number, gain: number) => {
    const next = bands.map((b, i) => i === index ? { ...b, gain } : b);
    setBands(next);
    setSelectedPreset('custom');
    if (!enabled) { setEnabled(true); AudioControl?.setEqEnabled(true); }
    AudioControl?.setBandLevel(index, Math.round(gain * 100));
    save(true, 'custom', next);
  };

  const togglePersist = useCallback((value: boolean) => {
    setPersistEqualizer(value);
    if (value) setEqualizerState({ enabled, preset: selectedPreset, gains: bands.map(b => b.gain) });
  }, [enabled, selectedPreset, bands, setPersistEqualizer, setEqualizerState]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0, paddingTop: insets.top }}>
      <ResponsivePane maxWidth={520}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 24 }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar ecualizador">
          <Ionicons name="chevron-down" size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: palette.textPrimary, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>Ecualizador</Text>
        <Switch
          value={enabled}
          onValueChange={toggleEnabled}
          trackColor={{ false: palette.surface3, true: palette.accent }}
          thumbColor="#fff"
        />
      </View>

      {!available && (
        <Text style={{ color: palette.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 24, marginBottom: 8 }}>
          Reproduce una canción para activar el ecualizador.
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, maxHeight: 56 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8, alignItems: 'center' }}
      >
        {DEFAULT_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            onPress={() => applyPreset(preset)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, height: 36, justifyContent: 'center',
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

      {/* Persist toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 28, padding: 14, backgroundColor: palette.surface2, borderRadius: 12 }}>
        <Ionicons name="save-outline" size={18} color={palette.textSecondary} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.textPrimary, fontSize: 15 }}>Recordar ajustes</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
            Mantener el ecualizador al cerrar la app
          </Text>
        </View>
        <Switch
          value={persistEqualizer}
          onValueChange={togglePersist}
          trackColor={{ false: palette.surface3, true: palette.accent }}
          thumbColor="#fff"
        />
      </View>
      </ResponsivePane>
    </View>
  );
}
