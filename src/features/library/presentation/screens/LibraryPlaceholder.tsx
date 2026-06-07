import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { palette } from '@/design-system/tokens/colors';
import { SongListItem } from '@/features/player/presentation/components/SongListItem';
import { SongOptionsModal } from '@/features/player/presentation/components/SongOptionsModal';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { useLibraryScan } from '../hooks/useLibrary';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '@/features/player/store/playerStore';
import type { Song, SortOrder } from '@/shared/types';

type Tab = 'songs' | 'albums' | 'artists' | 'genres';
const TABS: { key: Tab; label: string }[] = [
  { key: 'songs', label: 'Canciones' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'artists', label: 'Artistas' },
  { key: 'genres', label: 'Géneros' },
];

const audioService = TrackPlayerService.getInstance();

export function LibraryPlaceholder() {
  const repoRef = useRef<SongRepository | null>(null);
  if (!repoRef.current) repoRef.current = new SongRepository();
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('title');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const { isScanning, scanProgress, startScan } = useLibraryScan();
  const activeTrack = useActiveTrack();
  const { setCurrentSong, setQueue, setQueueIndex } = usePlayerStore();

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
    setLoading(false);
  }, [sortOrder, searchQuery]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  const handleScan = useCallback(async () => {
    const result = await startScan();
    if (result?.success) loadSongs();
  }, [startScan, loadSongs]);

  const handleSongPress = useCallback(async (song: Song) => {
    const idx = songs.findIndex(s => s.id === song.id);
    setCurrentSong(song);
    setQueue(songs, idx);
    setQueueIndex(idx);
    await audioService.setQueue(songs, idx, song.lastPosition);
    await repoRef.current!.incrementPlayCount(song.id);
  }, [songs, setCurrentSong, setQueue, setQueueIndex]);

  const isEmpty = !loading && songs.length === 0 && !isScanning;

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
            key={tab.key} onPress={() => setActiveTab(tab.key)}
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
      ) : (
        <FlashList
          data={songs}
          estimatedItemSize={68}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <SongListItem
              song={item}
              isPlaying={activeTrack?.id === item.id}
              onPress={handleSongPress}
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
    </SafeAreaView>
  );
}
