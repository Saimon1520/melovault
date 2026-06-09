import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, StatusBar, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useActiveTrack } from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';
import { SongListItem } from '@/features/player/presentation/components/SongListItem';
import { SongOptionsModal } from '@/features/player/presentation/components/SongOptionsModal';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { useLibraryScan } from '../hooks/useLibrary';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { useArchiveStore } from '@/features/library/store/archiveStore';
import { usePositionMemoryStore } from '@/features/player/store/positionMemoryStore';
import { PlaylistRepository } from '@/features/playlists/data/repositories/PlaylistRepository';
import { shuffle } from '@/shared/utils/shuffle';
import { shouldRememberPosition } from '@/features/player/domain/usecases/positionPolicy';
import { ArchivedSongsModal } from './ArchivedSongsModal';
import type { Song, SortOrder } from '@/shared/types';

type Tab = 'songs' | 'albums' | 'artists' | 'genres';
const TABS: { key: Tab; label: string }[] = [
  { key: 'songs', label: 'Canciones' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'artists', label: 'Artistas' },
  { key: 'genres', label: 'Géneros' },
];

const audioService = TrackPlayerService.getInstance();
const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface SongGroup {
  key: string;
  label: string;
  artwork?: string;
  songs: Song[];
}

// Groups songs by album / artist / genre for the corresponding library tabs.
function groupSongs(songs: Song[], by: 'albums' | 'artists' | 'genres'): SongGroup[] {
  const fallback =
    by === 'albums' ? 'Álbum desconocido' : by === 'artists' ? 'Artista desconocido' : 'Sin género';
  const pick = (s: Song) =>
    by === 'albums' ? s.album : by === 'artists' ? s.artist : s.genre;

  const map = new Map<string, SongGroup>();
  for (const s of songs) {
    const raw = (pick(s) ?? '').trim();
    const label = raw === '' || raw === 'Unknown Artist' || raw === 'Unknown Album' ? fallback : raw;
    const key = label.toLowerCase();
    let group = map.get(key);
    if (!group) {
      group = { key, label, artwork: s.artworkPath || undefined, songs: [] };
      map.set(key, group);
    }
    if (!group.artwork && s.artworkPath) group.artwork = s.artworkPath;
    group.songs.push(s);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function LibraryPlaceholder() {
  const repoRef = useRef<SongRepository | null>(null);
  if (!repoRef.current) repoRef.current = new SongRepository();
  const playlistRepoRef = useRef<PlaylistRepository | null>(null);
  if (!playlistRepoRef.current) playlistRepoRef.current = new PlaylistRepository();
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [selectedGroup, setSelectedGroup] = useState<SongGroup | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('title');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { isScanning, scanProgress, startScan } = useLibraryScan();
  const activeTrack = useActiveTrack();
  const { setCurrentSong, setQueue, setQueueIndex } = usePlayerStore();
  // Re-derive archived split whenever the user archives/restores something.
  const archivedIds = useArchiveStore(s => s.archivedIds);
  const unarchivedIds = useArchiveStore(s => s.unarchivedIds);
  // Position-memory markers: per-song opt-ins + songs inheriting from a
  // keep-position playlist.
  const rememberIds = usePositionMemoryStore(s => s.rememberIds);
  const [keepPosIds, setKeepPosIds] = useState<string[]>([]);
  const persistentIds = useMemo(
    () => new Set([...rememberIds, ...keepPosIds]),
    [rememberIds, keepPosIds],
  );

  const loadSongs = useCallback(async () => {
    setLoading(true);
    const all = await repoRef.current!.getAll(sortOrder);
    const q = searchQuery.trim().toLowerCase();
    setSongs(q
      ? all.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q))
      : all);
    playlistRepoRef.current!.getKeepPositionSongIds().then(setKeepPosIds).catch(() => {});
    setLoading(false);
  }, [sortOrder, searchQuery]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  const handleScan = useCallback(async () => {
    const result = await startScan();
    if (result?.success) loadSongs();
  }, [startScan, loadSongs]);

  // Play `song` queueing from `list` (the currently visible set: the full
  // library, or a selected album/artist/genre). Respects shuffle.
  const playFromList = useCallback(async (list: Song[], song: Song) => {
    const idx = list.findIndex(s => s.id === song.id);
    const shuffleEnabled = usePlayerStore.getState().shuffleEnabled;

    let playQueue = list;
    let startIndex = idx;
    if (shuffleEnabled) {
      playQueue = [song, ...shuffle(list.filter((_, i) => i !== idx))];
      startIndex = 0;
    }

    // Only resume mid-track when this song opted into position memory (or
    // inherits it from a playlist); otherwise start from the beginning.
    const startPositionMs = (await shouldRememberPosition(song)) ? song.lastPosition : 0;

    setCurrentSong(song);
    setQueue(playQueue, startIndex, list);
    setQueueIndex(startIndex);
    await audioService.setQueue(playQueue, startIndex, startPositionMs);
    await repoRef.current!.incrementPlayCount(song.id);
  }, [setCurrentSong, setQueue, setQueueIndex]);

  // Switch tab and drop any open album/artist/genre detail view.
  const selectTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelectedGroup(null);
  }, []);

  // Split off archived (non-music) audio so it doesn't clutter the library.
  const mainSongs = useMemo(
    () => songs.filter(s => !useArchiveStore.getState().isArchived(s)),
    [songs, archivedIds, unarchivedIds],
  );
  const archivedSongs = useMemo(
    () => songs.filter(s => useArchiveStore.getState().isArchived(s)),
    [songs, archivedIds, unarchivedIds],
  );

  const groups = useMemo(
    () => (activeTab === 'songs' ? [] : groupSongs(mainSongs, activeTab)),
    [mainSongs, activeTab],
  );

  // The song list currently shown (main library, or the open group's songs).
  const visibleSongs = selectedGroup ? selectedGroup.songs : mainSongs;
  const isEmpty = !loading && mainSongs.length === 0 && archivedSongs.length === 0 && !isScanning;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={palette.surface0} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        {showSearch ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
            <Ionicons name="search" size={16} color={palette.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar canciones, artistas..."
              placeholderTextColor={palette.textMuted}
              style={{ flex: 1, color: palette.textPrimary, fontSize: 15, marginLeft: 8 }}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 26, fontWeight: '800' }}>MeloVault</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
          <TouchableOpacity
            onPress={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery(''); }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface2, borderRadius: 18 }}
            accessibilityRole="button" accessibilityLabel={showSearch ? 'Cerrar búsqueda' : 'Buscar'}
          >
            <Ionicons name={showSearch ? 'close' : 'search'} size={18} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleScan} disabled={isScanning}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: isScanning ? palette.accentSoft : palette.surface2, borderRadius: 18 }}
            accessibilityRole="button" accessibilityLabel={isScanning ? 'Escaneando...' : 'Escanear música'}
          >
            {isScanning ? <ActivityIndicator size="small" color={palette.accent} /> : <Ionicons name="refresh" size={18} color={palette.textSecondary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scan progress bar */}
      {isScanning && scanProgress && (
        <View style={{ marginHorizontal: 20, marginBottom: 6, backgroundColor: palette.surface2, borderRadius: 10, padding: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Escaneando audios...</Text>
            <Text style={{ color: palette.accent, fontSize: 12 }}>{scanProgress.scanned}/{scanProgress.total || '?'}</Text>
          </View>
          {scanProgress.total > 0 && (
            <View style={{ height: 2, backgroundColor: palette.surface3, borderRadius: 1 }}>
              <View style={{ height: '100%', width: `${(scanProgress.scanned / scanProgress.total) * 100}%`, backgroundColor: palette.accent, borderRadius: 1 }} />
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 }}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key} onPress={() => selectTab(tab.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, marginRight: 4, borderRadius: 20,
              backgroundColor: activeTab === tab.key ? palette.accentSoft : 'transparent',
            }}
            accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={{ color: activeTab === tab.key ? palette.accent : palette.textMuted, fontSize: 14, fontWeight: '500' }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="musical-notes" size={32} color={palette.accent} />
          </View>
          <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Tu música, tu control</Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Toca el botón ↺ para escanear todos los archivos de audio de tu dispositivo
          </Text>
          <TouchableOpacity
            onPress={handleScan} disabled={isScanning}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: palette.accent, borderRadius: 30 }}
            accessibilityRole="button"
          >
            <Ionicons name="scan" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Escanear música</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab !== 'songs' && !selectedGroup ? (
        // Album / Artist / Genre groups
        <FlatList
          key={`groups-${activeTab}`}
          data={groups}
          keyExtractor={g => g.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedGroup(item)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}
              accessibilityRole="button"
            >
              <ExpoImage
                source={item.artwork ? { uri: item.artwork } : DEFAULT_ARTWORK}
                style={{ width: 52, height: 52, borderRadius: activeTab === 'artists' ? 26 : 8, backgroundColor: palette.surface2 }}
                contentFit="cover"
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '600' }}>{item.label}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.songs.length} {item.songs.length === 1 ? 'canción' : 'canciones'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, marginLeft: 80, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      ) : (
        // Song list — full library, or the songs of an open group
        <FlatList
          key={selectedGroup ? `group-${selectedGroup.key}` : 'all-songs'}
          data={visibleSongs}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            selectedGroup ? (
              <TouchableOpacity
                onPress={() => setSelectedGroup(null)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={20} color={palette.accent} />
                <Text numberOfLines={1} style={{ color: palette.textPrimary, fontSize: 17, fontWeight: '700', flex: 1 }}>{selectedGroup.label}</Text>
              </TouchableOpacity>
            ) : activeTab === 'songs' && archivedSongs.length > 0 ? (
              <TouchableOpacity
                onPress={() => setShowArchived(true)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
                accessibilityRole="button"
              >
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="archive-outline" size={20} color={palette.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '600' }}>Archivados</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                    {archivedSongs.length} {archivedSongs.length === 1 ? 'audio' : 'audios'} (notificaciones, notas de voz…)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <SongListItem
              song={item}
              isPlaying={activeTrack?.id === item.id}
              hasPersistence={persistentIds.has(item.id)}
              onPress={(song) => playFromList(visibleSongs, song)}
              onLongPress={setSelectedSong}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isScanning}
              onRefresh={handleScan}
              tintColor={palette.accent}
              colors={[palette.accent]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, marginLeft: 76, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* Song options modal (long press) */}
      <SongOptionsModal
        song={selectedSong}
        visible={selectedSong !== null}
        onClose={() => setSelectedSong(null)}
        onSongDeleted={(id) => {
          setSongs(prev => prev.filter(s => s.id !== id));
          setSelectedSong(null);
        }}
        onSongHidden={(id) => {
          setSongs(prev => prev.filter(s => s.id !== id));
          setSelectedSong(null);
        }}
      />

      {/* Archived (non-music) audio — separate space */}
      <ArchivedSongsModal
        visible={showArchived}
        songs={archivedSongs}
        persistentIds={persistentIds}
        onClose={() => setShowArchived(false)}
        onPlay={(song) => playFromList(archivedSongs, song)}
        onLongPress={setSelectedSong}
      />
    </SafeAreaView>
  );
}
