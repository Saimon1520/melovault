import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { SLEEP_TIMER_OPTIONS_MINUTES } from '@/shared/constants/audioFormats';

// "5 minutos", "1 hora", "1 h 30 min" — Spotify-style human labels.
function formatMinutes(min: number): string {
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hLabel = h === 1 ? '1 hora' : `${h} horas`;
  return m === 0 ? hLabel : `${h} h ${m} min`;
}

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedMin, setSelectedMin] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const endTime = Date.now() + minutes * 60 * 1000;

    timerRef.current = setInterval(async () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setRemainingMs(null);
        await TrackPlayer.pause();
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    setRemainingMs(minutes * 60 * 1000);
    setSelectedMin(minutes);
    onClose();
  };

  const cancelTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingMs(null);
    setSelectedMin(null);
  };

  const formatRemaining = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Countdown badge — shown in NowPlaying */}
      {remainingMs !== null && (
        <TouchableOpacity
          onPress={cancelTimer}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
            backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.accent,
          }}
          accessibilityRole="button" accessibilityLabel={`Sleep timer: ${formatRemaining(remainingMs)}. Toca para cancelar`}
        >
          <Ionicons name="moon" size={14} color={palette.accent} />
          <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600' }}>
            {formatRemaining(remainingMs)}
          </Text>
        </TouchableOpacity>
      )}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <TouchableOpacity
          activeOpacity={1} onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1} onPress={() => {}}
            style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 16 }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.surface3 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
              <Ionicons name="moon" size={18} color={palette.accent} />
              <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: '700', marginLeft: 10 }}>Temporizador de apagado</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} bounces={false}>
              {SLEEP_TIMER_OPTIONS_MINUTES.map(min => {
                const selected = selectedMin === min && remainingMs !== null;
                return (
                  <TouchableOpacity
                    key={min} onPress={() => startTimer(min)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}
                    accessibilityRole="button" accessibilityLabel={formatMinutes(min)}
                    accessibilityState={{ selected }}
                  >
                    <Text style={{ flex: 1, color: selected ? palette.accent : palette.textPrimary, fontSize: 15, fontWeight: selected ? '700' : '500' }}>
                      {formatMinutes(min)}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={palette.accent} />}
                  </TouchableOpacity>
                );
              })}
              {remainingMs !== null && (
                <TouchableOpacity
                  onPress={() => { cancelTimer(); onClose(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}
                  accessibilityRole="button"
                >
                  <Text style={{ flex: 1, color: palette.error, fontSize: 15, fontWeight: '600' }}>
                    Desactivar temporizador
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 13 }}>{formatRemaining(remainingMs)}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
