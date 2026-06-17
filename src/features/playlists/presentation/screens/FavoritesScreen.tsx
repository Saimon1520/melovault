import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { useFavoritesStore } from '@/features/player/store/favoritesStore';
import { shuffle } from '@/shared/utils/shuffle';
import { DockedMiniPlayer } from '@/features/player/presentation/components/DockedMiniPlayer';
import type { Song } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');
const songRepo = new SongRepository();
const audioService = TrackPlayerService.getInstance();

/**
 * Default, always-present "Favoritos" playlist. It's virtual — its contents are
 * exactly the songs the user has hearted (favoritesStore). Hearting a song adds
 * it here; un-hearting removes it. Nothing is stored as a real DB playlist.
 */
export function FavoritesScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const activeTrack = useActiveTrack();
  const favoriteIds = useFavoritesStore(s => s.favoriteIds);
  const toggleFavorite = useFavoritesStore(s => s.toggleFavorite);
  const [songs, setSongs] = useState<Song[]>([]);
  const { setCurrentSong, setQueue, setQueueIndex, setShuffleEnabled } = usePlayerStore();

  // Re-resolve the favorited songs whenever the set changes or we open.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    Promise.all(favoriteIds.map(id => songRepo.getById(id)))
      .then(list => { if (active) setSongs(list.filter((s): s is Song => !!s)); });
    return () => { active = false; };
  }, [visible, favoriteIds]);

  const playAt = useCallback(async (index: number) => {
    const song = songs[index];
    if (!song) return;
    setCurrentSong(song);
    setQueue(songs, index, songs);
    setQueueIndex(index);
    await audioService.setQueue(songs, index, 0);
  }, [songs, setCurrentSong, setQueue, setQueueIndex]);

  const playInOrder = useCallback(async () => {
    if (songs.length === 0) return;
    setShuffleEnabled(false);
    await playAt(0);
  }, [songs, setShuffleEnabled, playAt]);

  // Fresh random order on every press — never the same sequence twice.
  const playShuffled = useCallback(async () => {
    if (songs.length === 0) return;
    const order = shuffle(songs);
    setShuffleEnabled(true);
    setCurrentSong(order[0]!);
    setQueue(order, 0, order);
    setQueueIndex(0);
    await audioService.setQueue(order, 0, 0);
  }, [songs, setShuffleEnabled, setCurrentSong, setQueue, setQueueIndex]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'left', 'right']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={26} color={palette.textSecondary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 4, gap: 8 }}>
            <Ionicons name="heart" size={20} color={palette.accent} />
            <View>
              <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>Favoritos</Text>
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
              </Text>
            </View>
          </View>
        </View>

        {songs.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="heart-outline" size={32} color={palette.accent} />
            </View>
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>Sin favoritos aún</Text>
            <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              Toca el corazón de una canción (en el reproductor o en su menú) para agregarla aquí.
            </Text>
          </View>
        ) : (
          <>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
            <TouchableOpacity
              onPress={playInOrder}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 26, backgroundColor: palette.accent }}
              accessibilityRole="button" accessibilityLabel="Reproducir"
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Reproducir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={playShuffled}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 26, backgroundColor: palette.surface2 }}
              accessibilityRole="button" accessibilityLabel="Reproducir aleatoriamente"
            >
              <Ionicons name="shuffle" size={18} color={palette.accent} />
              <Text style={{ color: palette.accent, fontSize: 15, fontWeight: '700' }}>Aleatorio</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={songs}
            keyExtractor={s => s.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => playAt(index)}
                style={{
                  flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: activeTrack?.id === item.id ? palette.accentSoft : 'transparent',
                }}
                accessibilityRole="button"
              >
                <ExpoImage
                  source={item.artworkPath ? { uri: item.artworkPath } : DEFAULT_ARTWORK}
                  style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: palette.surface2 }}
                  contentFit="cover"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                  <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{item.artist}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite(item.id)}
                  style={{ padding: 8 }}
                  accessibilityRole="button" accessibilityLabel="Quitar de favoritos"
                >
                  <Ionicons name="heart" size={22} color={palette.accent} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
          </>
        )}

        <DockedMiniPlayer onRequestClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
