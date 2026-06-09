import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { SLEEP_TIMER_OPTIONS_MINUTES } from '@/shared/constants/audioFormats';

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
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
    onClose();
  };

  const cancelTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingMs(null);
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="moon" size={22} color={palette.accent} />
              <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 10 }}>Sleep Timer</Text>
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto', padding: 4 }}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {SLEEP_TIMER_OPTIONS_MINUTES.map(min => (
                <TouchableOpacity
                  key={min} onPress={() => startTimer(min)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: palette.surface2, minWidth: 80, alignItems: 'center' }}
                  accessibilityRole="button" accessibilityLabel={`${min} minutos`}
                >
                  <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 15 }}>{min}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            {remainingMs !== null && (
              <TouchableOpacity
                onPress={cancelTimer}
                style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: palette.error + '22', alignItems: 'center', borderWidth: 1, borderColor: palette.error }}
                accessibilityRole="button"
              >
                <Text style={{ color: palette.error, fontWeight: '600' }}>Cancelar timer ({formatRemaining(remainingMs)})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
