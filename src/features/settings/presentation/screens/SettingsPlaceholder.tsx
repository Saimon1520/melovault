import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { SEEK_SECONDS_OPTIONS } from '@/shared/constants/audioFormats';
import type { PlaybackSpeed } from '@/shared/types';

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
      {title}
    </Text>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: palette.surface1 }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: palette.textPrimary, fontSize: 15 }}>{label}</Text>
        {description && <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

function ChipSelector<T extends string | number>({ options, value, onChange, format }: {
  options: T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={String(opt)}
          onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
            backgroundColor: value === opt ? palette.accentSoft : palette.surface2,
            borderWidth: 1, borderColor: value === opt ? palette.accent : 'transparent',
          }}
        >
          <Text style={{ color: value === opt ? palette.accent : palette.textMuted, fontSize: 13 }}>
            {format ? format(opt) : String(opt)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SettingsPlaceholder() {
  const {
    seekSeconds, setSeekSeconds,
    crossfadeMs, setCrossfadeMs,
    gaplessPlayback, setGaplessPlayback,
    defaultSpeed, setDefaultSpeed,
  } = useSettingsStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Text style={{ color: palette.textPrimary, fontSize: 26, fontWeight: '800', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        Ajustes
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionHeader title="REPRODUCCIÓN" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 }}>
          <SettingRow label="Retroceso / Avance" description="Segundos al tocar ↺ ↻">
            <ChipSelector
              options={[...SEEK_SECONDS_OPTIONS]}
              value={seekSeconds}
              onChange={setSeekSeconds}
              format={v => `${v}s`}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow label="Velocidad predeterminada">
            <ChipSelector
              options={SPEEDS}
              value={defaultSpeed}
              onChange={setDefaultSpeed}
              format={v => `${v}x`}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow label="Reproducción sin pausas" description="Elimina el silencio entre canciones">
            <Switch
              value={gaplessPlayback} onValueChange={setGaplessPlayback}
              trackColor={{ false: palette.surface3, true: palette.accentDim }}
              thumbColor={gaplessPlayback ? palette.accent : palette.textMuted}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow label="Crossfade" description="Mezcla el final de una canción con el inicio de la siguiente">
            <ChipSelector
              options={[0, 2000, 4000, 6000, 8000, 10000, 12000]}
              value={crossfadeMs}
              onChange={setCrossfadeMs}
              format={v => v === 0 ? 'Off' : `${v / 1000}s`}
            />
          </SettingRow>
        </View>

        <SectionHeader title="ACERCA DE" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 }}>
          <View style={{ backgroundColor: palette.surface1, paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: '800' }}>MeloVault</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 4 }}>Versión 1.0.0</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 12, lineHeight: 20 }}>
              Reproductor de música local, gratuito, sin anuncios, sin rastreo.{'\n'}
              Tu música. Tu control.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
