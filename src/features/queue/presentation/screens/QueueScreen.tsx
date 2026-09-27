import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
import TrackPlayer, { Track, useActiveTrack } from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/design-system/useTheme';
import { usePlayerStore } from '@/features/player/store/playerStore';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface QueueScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function QueueScreen({ visible, onClose }: QueueScreenProps) {
  const palette = useTheme();
  const activeTrack = useActiveTrack();
  const [queue, setQueue] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadQueue = useCallback(async () => {
    const q = await TrackPlayer.getQueue();
    const idx = await TrackPlayer.getActiveTrackIndex();
    setQueue(q);
    setActiveIndex(idx ?? 0);
  }, []);

  useEffect(() => {
    if (visible) loadQueue();
  }, [visible, loadQueue]);

  // Keep the highlighted row in sync when the song changes while the list is open.
  useEffect(() => {
    if (visible) loadQueue();
  }, [activeTrack?.id, visible, loadQueue]);

  // Every edit runs one at a time and then re-reads the player's real queue, so
  // the list always shows what will actually play — a fast double tap can't
  // apply a move to indices that already shifted.
  const busy = useRef(false);
  const runEdit = useCallback(async (edit: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await edit();
    } catch {
      // fall through to the reload so the list never shows a stale order
    } finally {
      await loadQueue().catch(() => {});
      busy.current = false;
    }
  }, [loadQueue]);

  const playAt = (index: number) => runEdit(async () => {
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  });

  const removeAt = (index: number) => {
    if (index === activeIndex) {
      Alert.alert('No se puede eliminar', 'No puedes eliminar la canción que se está reproduciendo actualmente.');
      return;
    }
    runEdit(() => TrackPlayer.remove(index));
  };

  // Moves one row and mirrors the edit into the store's queue, so it survives
  // the next lap of the endless queue and a restart (the store is what both
  // re-queue from).
  const move = (index: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? index - 1 : index + 1;
    const songId = queue[index]?.id;
    const neighborId = queue[to]?.id;
    if (songId == null || neighborId == null) return;
    runEdit(async () => {
      await TrackPlayer.move(index, to);
      if (String(songId) !== String(neighborId)) {
        usePlayerStore.getState().moveSongInQueue(String(songId), String(neighborId), direction);
      }
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    move(index, 'up');
  };

  const moveDown = (index: number) => {
    if (index >= queue.length - 1) return;
    move(index, 'down');
  };

  const clearQueue = () => {
    Alert.alert('Limpiar cola', '¿Eliminar todas las canciones excepto la actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar', style: 'destructive',
        onPress: () => runEdit(async () => {
          const indicesToRemove = queue.map((_, i) => i).filter(i => i !== activeIndex);
          await TrackPlayer.remove(indicesToRemove);
        }),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 640, alignSelf: 'center', height: '80%', paddingBottom: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20 }}>
            <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>
              Cola de reproducción
            </Text>
            <TouchableOpacity
              onPress={clearQueue}
              style={{ marginRight: 16, padding: 4 }}
              accessibilityRole="button" accessibilityLabel="Limpiar cola"
            >
              <Ionicons name="trash-outline" size={20} color={palette.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar cola">
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: palette.textMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 }}>
            {queue.length} canción{queue.length !== 1 ? 'es' : ''}
          </Text>

          <FlatList
            data={queue}
            style={{ flex: 1 }}
            keyExtractor={(item, idx) => `${String(item.id ?? '')}_${idx}`}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item, index }) => {
              const isCurrent = index === activeIndex;
              return (
                <TouchableOpacity
                  onPress={() => playAt(index)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 10,
                    backgroundColor: isCurrent ? palette.accentSoft : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title ?? 'Sin título'} por ${item.artist ?? 'Desconocido'}${isCurrent ? ', reproduciendo ahora' : ''}`}
                >
                  <ExpoImage
                    source={item.artwork ? { uri: String(item.artwork) } : DEFAULT_ARTWORK}
                    style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: isCurrent ? palette.accent : palette.textPrimary, fontSize: 15, fontWeight: isCurrent ? '700' : '400' }}
                      numberOfLines={1}
                    >
                      {item.title ?? 'Sin título'}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
                      {item.artist ?? 'Desconocido'}
                    </Text>
                  </View>
                  {/* Reorder controls */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {!isCurrent && (
                      <>
                        <TouchableOpacity
                          onPress={() => moveUp(index)}
                          style={{ padding: 6 }}
                          accessibilityRole="button" accessibilityLabel="Mover arriba"
                        >
                          <Ionicons name="chevron-up" size={16} color={index === 0 ? palette.surface3 : palette.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveDown(index)}
                          style={{ padding: 6 }}
                          accessibilityRole="button" accessibilityLabel="Mover abajo"
                        >
                          <Ionicons name="chevron-down" size={16} color={index >= queue.length - 1 ? palette.surface3 : palette.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeAt(index)}
                          style={{ padding: 6 }}
                          accessibilityRole="button" accessibilityLabel="Eliminar de la cola"
                        >
                          <Ionicons name="close" size={18} color={palette.textMuted} />
                        </TouchableOpacity>
                      </>
                    )}
                    {isCurrent && (
                      <Ionicons name="musical-note" size={18} color={palette.accent} style={{ marginHorizontal: 8 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
