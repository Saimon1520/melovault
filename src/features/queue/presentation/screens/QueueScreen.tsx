import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
import TrackPlayer, { Track, useActiveTrack } from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { palette } from '@/design-system/tokens/colors';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface QueueScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function QueueScreen({ visible, onClose }: QueueScreenProps) {
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

  const playAt = async (index: number) => {
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
    setActiveIndex(index);
  };

  const removeAt = async (index: number) => {
    if (index === activeIndex) {
      Alert.alert('No se puede eliminar', 'No puedes eliminar la canción que se está reproduciendo actualmente.');
      return;
    }
    await TrackPlayer.remove(index);
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < activeIndex) setActiveIndex(prev => prev - 1);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    await TrackPlayer.move(index, index - 1);
    const newQueue = [...queue];
    [newQueue[index]!, newQueue[index - 1]!] = [newQueue[index - 1]!, newQueue[index]!];
    setQueue(newQueue);
    if (activeIndex === index) setActiveIndex(index - 1);
    else if (activeIndex === index - 1) setActiveIndex(index);
  };

  const moveDown = async (index: number) => {
    if (index >= queue.length - 1) return;
    await TrackPlayer.move(index, index + 1);
    const newQueue = [...queue];
    [newQueue[index]!, newQueue[index + 1]!] = [newQueue[index + 1]!, newQueue[index]!];
    setQueue(newQueue);
    if (activeIndex === index) setActiveIndex(index + 1);
    else if (activeIndex === index + 1) setActiveIndex(index);
  };

  const clearQueue = () => {
    Alert.alert('Limpiar cola', '¿Eliminar todas las canciones excepto la actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar', style: 'destructive',
        onPress: async () => {
          const indicesToRemove = queue.map((_, i) => i).filter(i => i !== activeIndex);
          await TrackPlayer.remove(indicesToRemove);
          setQueue(prev => prev.filter((_, i) => i === activeIndex));
          setActiveIndex(0);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', paddingBottom: 24 }}>
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
