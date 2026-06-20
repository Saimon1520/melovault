import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/design-system/useTheme';
import { DockedMiniPlayer } from '@/features/player/presentation/components/DockedMiniPlayer';
import type { Song } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

/**
 * Manage the songs the user has hidden from the library. Hiding only sets a
 * flag (the file stays on the device), so this screen lets them bring any of
 * them back — the recovery path promised by the "Ocultar canción" dialog.
 */
export function HiddenSongsModal({
  visible, songs, onClose, onUnhide,
}: {
  visible: boolean;
  songs: Song[];
  onClose: () => void;
  onUnhide: (songId: string) => void;
}) {
  const palette = useTheme();
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
            <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>Canciones ocultas</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              {songs.length} {songs.length === 1 ? 'canción oculta' : 'canciones ocultas'}
            </Text>
          </View>
        </View>

        {songs.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
              <Ionicons name="search" size={16} color={palette.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar en ocultas..."
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
        )}

        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
              <ExpoImage
                source={item.artworkPath ? { uri: item.artworkPath } : DEFAULT_ARTWORK}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
              <View style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
                <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 15 }}>{item.title}</Text>
                <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>{item.artist}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onUnhide(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: palette.surface2 }}
                accessibilityRole="button" accessibilityLabel={`Volver a mostrar ${item.title}`}
              >
                <Ionicons name="eye-outline" size={16} color={palette.accent} />
                <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600' }}>Mostrar</Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: palette.glass10 }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 40 }}>
              {query ? 'Sin resultados.' : 'No tienes canciones ocultas.'}
            </Text>
          }
        />

        <DockedMiniPlayer onRequestClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
