import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system/useTheme';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { SongListItem } from '@/features/player/presentation/components/SongListItem';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { resolveResumePosition } from '@/features/player/domain/usecases/resumePosition';
import type { Song } from '@/shared/types';
import { useActiveTrack } from 'react-native-track-player';

const audioService = TrackPlayerService.getInstance();

let _songRepo: SongRepository | null = null;
function getSongRepo() {
  if (!_songRepo) _songRepo = new SongRepository();
  return _songRepo;
}

export function SearchScreen() {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const activeTrack = useActiveTrack();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string) => {
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    const q = text.trim().toLowerCase();
    const all = await getSongRepo().getAll('title', 'asc');
    const filtered = all.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.album ?? '').toLowerCase().includes(q) ||
      (s.genre ?? '').toLowerCase().includes(q),
    );
    setResults(filtered);
    setLoading(false);
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 250);
  };

  const playSong = useCallback(async (song: Song) => {
    const index = results.findIndex(s => s.id === song.id);
    const startPositionMs = await resolveResumePosition(song);
    await audioService.setQueue(results.length > 0 ? results : [song], index >= 0 ? index : 0, startPositionMs);
  }, [results]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.surface0, paddingLeft: insets.left, paddingRight: insets.right }}
    >
      {/* Search bar */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: palette.surface1 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: palette.surface2, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 10,
        }}>
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            value={query}
            onChangeText={handleChange}
            placeholder="Canciones, artistas, álbumes..."
            placeholderTextColor={palette.textMuted}
            style={{ flex: 1, color: palette.textPrimary, fontSize: 16 }}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Buscar música"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {!query.trim() ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="search" size={56} color={palette.surface3} />
          <Text style={{ color: palette.textMuted, fontSize: 16, marginTop: 16, textAlign: 'center' }}>
            Busca canciones por título, artista, álbum o género
          </Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: palette.textMuted }}>Buscando...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="musical-note" size={48} color={palette.surface3} />
          <Text style={{ color: palette.textPrimary, fontSize: 17, fontWeight: '600', marginTop: 16 }}>Sin resultados</Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            No se encontraron canciones para "{query}"
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ color: palette.textMuted, fontSize: 13, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </Text>
          <FlashList
            data={results}
            estimatedItemSize={72}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SongListItem
                song={item}
                isPlaying={activeTrack?.id === item.id}
                onPress={() => playSong(item)}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}
