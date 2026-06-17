import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, StatusBar,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { PlaylistRepository } from '@/features/playlists/data/repositories/PlaylistRepository';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { useArchiveStore } from '@/features/library/store/archiveStore';
import { DockedMiniPlayer } from '@/features/player/presentation/components/DockedMiniPlayer';
import { shuffle } from '@/shared/utils/shuffle';
import type { Playlist, Song } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');
const playlistRepo = new PlaylistRepository();
const songRepo = new SongRepository();
const audioService = TrackPlayerService.getInstance();

function Artwork({ uri, size = 48, rounded = 8 }: { uri?: string; size?: number; rounded?: number }) {
  return (
    <ExpoImage
      source={uri ? { uri } : DEFAULT_ARTWORK}
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: palette.surface2 }}
      contentFit="cover"
    />
  );
}

// ── Song picker (searchable, multi-select) ───────────────────────────────────
function SongPickerModal({
  visible, excludeIds, onClose, onAdd,
}: {
  visible: boolean;
  excludeIds: Set<string>;
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Hide non-music (notification tones, WhatsApp voice notes…) by default —
  // they're rarely what you want in a playlist. Toggle off to see everything.
  const [onlySongs, setOnlySongs] = useState(true);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(new Set());
      setOnlySongs(true);
      songRepo.getAll('title').then(setAllSongs);
    }
  }, [visible]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isArchived = useArchiveStore.getState().isArchived;
    let base = allSongs.filter(s => !excludeIds.has(s.id));
    if (onlySongs) base = base.filter(s => !isArchived(s));
    if (!q) return base;
    return base.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q));
  }, [allSongs, query, excludeIds, onlySongs]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header + search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={palette.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search" size={16} color={palette.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar canciones para agregar"
              placeholderTextColor={palette.textMuted}
              style={{ flex: 1, color: palette.textPrimary, fontSize: 15, marginLeft: 8 }}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick filter: hide non-music (archived) audios */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setOnlySongs(v => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
              backgroundColor: onlySongs ? palette.accentSoft : palette.surface2,
              borderWidth: 1, borderColor: onlySongs ? palette.accent : 'transparent',
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: onlySongs }}
            accessibilityLabel="Mostrar solo canciones"
          >
            <Ionicons name={onlySongs ? 'musical-notes' : 'musical-notes-outline'} size={15} color={onlySongs ? palette.accent : palette.textMuted} />
            <Text style={{ color: onlySongs ? palette.accent : palette.textMuted, fontSize: 13, fontWeight: '600' }}>Solo canciones</Text>
          </TouchableOpacity>
        </View>

        <FlashList
          data={results}
          estimatedItemSize={64}
          keyExtractor={s => s.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            const isOn = selected.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggle(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn }}
              >
                <Artwork uri={item.artworkPath} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                  <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{item.artist}</Text>
                </View>
                <View style={{
                  width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: isOn ? palette.accent : palette.surface3,
                  backgroundColor: isOn ? palette.accent : 'transparent',
                }}>
                  {isOn && <Ionicons name="checkmark" size={15} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 40 }}>
              {allSongs.length === 0 ? 'Escanea tu música primero.' : 'Sin resultados.'}
            </Text>
          }
        />

        {/* Add button */}
        {selected.size > 0 && (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <TouchableOpacity
              onPress={() => { onAdd([...selected]); onClose(); }}
              style={{ backgroundColor: palette.accent, borderRadius: 28, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 6 }}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                Agregar {selected.size} {selected.size === 1 ? 'canción' : 'canciones'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Playlist detail ──────────────────────────────────────────────────────────
export function PlaylistDetailScreen({
  playlist, visible, onClose, onChanged,
}: {
  playlist: Playlist | null;
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const { setCurrentSong, setQueue, setQueueIndex, setShuffleEnabled } = usePlayerStore();

  const load = useCallback(async () => {
    if (!playlist) return;
    const ids = await playlistRepo.getSongIds(playlist.id);
    const list = (await Promise.all(ids.map(id => songRepo.getById(id)))).filter((s): s is Song => !!s);
    setSongs(list);
  }, [playlist]);

  useEffect(() => { if (visible) { setShowPicker(false); load(); } }, [visible, load]);

  const handleAdd = useCallback(async (ids: string[]) => {
    if (!playlist) return;
    for (const id of ids) await playlistRepo.addSong(playlist.id, id);
    await load();
    onChanged();
  }, [playlist, load, onChanged]);

  const handleRemove = useCallback(async (songId: string) => {
    if (!playlist) return;
    await playlistRepo.removeSong(playlist.id, songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
    // If this playlist is what's currently playing, also drop the song from the
    // live queue so it doesn't keep coming up after being removed.
    if (usePlayerStore.getState().queueContextId === playlist.id) {
      await audioService.removeFromQueue(songId);
      usePlayerStore.getState().removeSongFromQueue(songId);
    }
    onChanged();
  }, [playlist, onChanged]);

  const playAt = useCallback(async (index: number) => {
    const song = songs[index];
    if (!song || !playlist) return;
    setCurrentSong(song);
    setQueue(songs, index, songs, playlist.id);
    setQueueIndex(index);
    await audioService.setQueue(songs, index, 0);
  }, [songs, playlist, setCurrentSong, setQueue, setQueueIndex]);

  // Play the whole playlist from the top, in order.
  const playInOrder = useCallback(async () => {
    if (songs.length === 0) return;
    setShuffleEnabled(false);
    await playAt(0);
  }, [songs, setShuffleEnabled, playAt]);

  // Play the playlist in a fresh random order — re-shuffled on every press, so
  // it's never the same sequence twice.
  const playShuffled = useCallback(async () => {
    if (songs.length === 0 || !playlist) return;
    const order = shuffle(songs);
    setShuffleEnabled(true);
    setCurrentSong(order[0]!);
    setQueue(order, 0, order, playlist.id);
    setQueueIndex(0);
    await audioService.setQueue(order, 0, 0);
  }, [songs, playlist, setShuffleEnabled, setCurrentSong, setQueue, setQueueIndex]);

  const excludeIds = useMemo(() => new Set(songs.map(s => s.id)), [songs]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={26} color={palette.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>{playlist?.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>{songs.length} {songs.length === 1 ? 'canción' : 'canciones'}</Text>
              {playlist?.keepPosition && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.persistenceActive }} />
                  <Text style={{ color: palette.persistenceActive, fontSize: 11 }}>Recuerda posición</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: 19 }}
            accessibilityRole="button" accessibilityLabel="Agregar canciones"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {songs.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="musical-notes" size={32} color={palette.accent} />
            </View>
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>Playlist vacía</Text>
            <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              Agrega canciones de tu biblioteca.
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 22, paddingVertical: 13, backgroundColor: palette.accent, borderRadius: 26 }}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Agregar canciones</Text>
            </TouchableOpacity>
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
          <FlashList
            data={songs}
            estimatedItemSize={64}
            keyExtractor={s => s.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => playAt(index)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}
                accessibilityRole="button"
              >
                <Artwork uri={item.artworkPath} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                  <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{item.artist}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item.id)} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Quitar de la playlist">
                  <Ionicons name="remove-circle-outline" size={22} color={palette.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
          </>
        )}

        <SongPickerModal
          visible={showPicker}
          excludeIds={excludeIds}
          onClose={() => setShowPicker(false)}
          onAdd={handleAdd}
        />

        {!showPicker && <DockedMiniPlayer onRequestClose={onClose} />}
      </SafeAreaView>
    </Modal>
  );
}
