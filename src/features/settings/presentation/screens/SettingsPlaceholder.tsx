import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StatusBar, Alert, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { SEEK_SECONDS_OPTIONS } from '@/shared/constants/audioFormats';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { HiddenSongsModal } from './HiddenSongsModal';
import type { PlaybackSpeed, Song } from '@/shared/types';

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
      {title}
    </Text>
  );
}

function SettingRow({ label, description, children, stacked }: { label: string; description?: string; children: React.ReactNode; stacked?: boolean }) {
  // `stacked` puts the control on its own row below the label — used for chip
  // selectors so the chips get the full width and don't get squeezed / wrap
  // awkwardly next to the label (especially in portrait).
  if (stacked) {
    return (
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: palette.surface1 }}>
        <Text style={{ color: palette.textPrimary, fontSize: 15 }}>{label}</Text>
        {description && <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{description}</Text>}
        <View style={{ marginTop: 12 }}>{children}</View>
      </View>
    );
  }
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
    playDuringMeetings, setPlayDuringMeetings,
    interruptionMode, setInterruptionMode,
  } = useSettingsStore();

  const songRepoRef = useRef<SongRepository | null>(null);
  if (!songRepoRef.current) songRepoRef.current = new SongRepository();
  const [hiddenSongs, setHiddenSongs] = useState<Song[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const loadHidden = useCallback(() => {
    songRepoRef.current!.getHidden().then(setHiddenSongs).catch(() => {});
  }, []);

  // Keep the count fresh whenever Settings comes into focus (a song may have
  // been hidden from the library while this tab was in the background).
  useFocusEffect(loadHidden);

  const handleUnhide = useCallback(async (songId: string) => {
    const result = await songRepoRef.current!.unhideSong(songId);
    if (result.success) {
      setHiddenSongs(prev => prev.filter(s => s.id !== songId));
      ToastAndroid.show('Canción restaurada a la biblioteca', ToastAndroid.SHORT);
    } else {
      ToastAndroid.show('No se pudo restaurar la canción', ToastAndroid.LONG);
    }
  }, []);

  const toggleMeetings = (value: boolean) => {
    setPlayDuringMeetings(value);
    Alert.alert(
      value ? 'Reproducir en reuniones activado' : 'Ajuste actualizado',
      value
        ? 'La música seguirá sonando durante llamadas y reuniones (sonará junto al audio de la reunión). Reinicia la app para aplicar el cambio.'
        : 'La música volverá a pausarse durante llamadas y reuniones. Reinicia la app para aplicar el cambio.',
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <Text style={{ color: palette.textPrimary, fontSize: 26, fontWeight: '800', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        Ajustes
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <SectionHeader title="REPRODUCCIÓN" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 }}>
          <SettingRow stacked label="Retroceso / Avance" description="Segundos al tocar ↺ ↻">
            <ChipSelector
              options={[...SEEK_SECONDS_OPTIONS]}
              value={seekSeconds}
              onChange={setSeekSeconds}
              format={v => `${v}s`}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow stacked label="Velocidad predeterminada">
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
          <SettingRow stacked label="Fundido entre canciones" description="Baja el volumen al final de una canción y sube el de la siguiente. No se superponen (un solo reproductor de audio).">
            <ChipSelector
              options={[0, 2000, 4000, 6000, 8000, 10000, 12000]}
              value={crossfadeMs}
              onChange={setCrossfadeMs}
              format={v => v === 0 ? 'Off' : `${v / 1000}s`}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow stacked label="Al sonar una notificación" description="Qué hacer cuando otra app reproduce un sonido. Aplica al reiniciar.">
            <ChipSelector
              options={['pause', 'duck'] as const}
              value={interruptionMode}
              onChange={setInterruptionMode}
              format={v => (v === 'pause' ? 'Pausar' : 'Atenuar')}
            />
          </SettingRow>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 20 }} />
          <SettingRow label="Reproducir en reuniones y llamadas" description="No pausar la música cuando otra app (Meet, Zoom…) usa el audio. Aplica al reiniciar.">
            <Switch
              value={playDuringMeetings} onValueChange={toggleMeetings}
              trackColor={{ false: palette.surface3, true: palette.accentDim }}
              thumbColor={playDuringMeetings ? palette.accent : palette.textMuted}
            />
          </SettingRow>
        </View>

        <SectionHeader title="BIBLIOTECA" />
        <View style={{ borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 }}>
          <TouchableOpacity
            onPress={() => { loadHidden(); setShowHidden(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: palette.surface1 }}
            accessibilityRole="button" accessibilityLabel="Canciones ocultas"
          >
            <Ionicons name="eye-off-outline" size={20} color={palette.textSecondary} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textPrimary, fontSize: 15 }}>Canciones ocultas</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>Volver a mostrarlas en la biblioteca</Text>
            </View>
            {hiddenSongs.length > 0 && (
              <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: palette.surface3, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '700' }}>{hiddenSongs.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
          </TouchableOpacity>
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

      <HiddenSongsModal
        visible={showHidden}
        songs={hiddenSongs}
        onClose={() => setShowHidden(false)}
        onUnhide={handleUnhide}
      />
    </SafeAreaView>
  );
}
