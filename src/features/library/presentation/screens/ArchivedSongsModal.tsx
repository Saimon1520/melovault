import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';
import { SongListItem } from '@/features/player/presentation/components/SongListItem';
import { DockedMiniPlayer } from '@/features/player/presentation/components/DockedMiniPlayer';
import type { Song } from '@/shared/types';

/**
 * Separate space (à la WhatsApp's archived chats) for audio that isn't really
 * music — notification tones, WhatsApp voice notes, etc. Still fully playable
 * and long-pressable to add to playlists or restore to the library.
 */
export function ArchivedSongsModal({
  visible, songs, persistentIds, onClose, onPlay, onLongPress,
}: {
  visible: boolean;
  songs: Song[];
  persistentIds?: Set<string>;
  onClose: () => void;
  onPlay: (song: Song) => void;
  onLongPress: (song: Song) => void;
}) {
  const activeTrack = useActiveTrack();
  const [searchQuery, setSearchQuery] = useState('');

  const query = searchQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return songs;
    return songs.filter(s =>
      s.title.toLowerCase().includes(query) ||
      (s.artist?.toLowerCase().includes(query) ?? false) ||
      (s.album?.toLowerCase().includes(query) ?? false),
    );
  }, [songs, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'left', 'right']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={26} color={palette.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>Archivados</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              {songs.length} {songs.length === 1 ? 'audio' : 'audios'} fuera de la biblioteca
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
            <Ionicons name="search" size={16} color={palette.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar en archivados..."
              placeholderTextColor={palette.textMuted}
              style={{ flex: 1, color: palette.textPrimary, fontSize: 15, marginLeft: 8 }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <SongListItem
              song={item}
              isPlaying={activeTrack?.id === item.id}
              hasPersistence={persistentIds?.has(item.id)}
              onPress={onPlay}
              onLongPress={onLongPress}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 40 }}>
              {query ? 'Sin resultados.' : 'No hay audios archivados.'}
            </Text>
          }
        />

        <DockedMiniPlayer onRequestClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
