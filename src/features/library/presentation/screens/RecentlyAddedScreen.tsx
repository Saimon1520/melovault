import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { useTheme } from '@/design-system/useTheme';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { useArchiveStore } from '@/features/library/store/archiveStore';
import { shuffle } from '@/shared/utils/shuffle';
import { DockedMiniPlayer } from '@/features/player/presentation/components/DockedMiniPlayer';
import { CompactSelector } from '@/shared/components/CompactSelector';
import { backfillFileDates } from '../../domain/usecases/FileDateService';
import { useLibraryPrefsStore } from '../../store/libraryPrefsStore';
import {
  DATE_FILTER_OPTIONS, filterByDownloadDate, sortByDownloadDate,
  getDownloadDate, formatDownloadDate, useDownloadDates,
} from '../../domain/downloadDate';
import type { Song } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');
const songRepo = new SongRepository();
const audioService = TrackPlayerService.getInstance();

/**
 * "Recién agregadas" — a virtual playlist of the songs most recently DOWNLOADED
 * onto the phone, newest first.
 *
 * The ordering comes from MediaStore's DATE_ADDED (cached in fileDateStore), not
 * from MeloVault's own `created_at`: the latter only records when a scan first
 * noticed a file, so on an existing library every song would share the install
 * date and this list would be meaningless.
 */
export function RecentlyAddedScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const palette = useTheme();
  const activeTrack = useActiveTrack();
  const downloadDates = useDownloadDates();
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  // Persisted, so the range the user last looked at is the one that opens.
  const dateFilter = useLibraryPrefsStore(s => s.recentFilter);
  const setDateFilter = useLibraryPrefsStore(s => s.setRecentFilter);
  const { setCurrentSong, setQueue, setQueueIndex, setShuffleEnabled } = usePlayerStore();
  // Re-derive when the user archives/restores something.
  const archivedIds = useArchiveStore(s => s.archivedIds);
  const unarchivedIds = useArchiveStore(s => s.unarchivedIds);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    songRepo.getAll('title').then(list => {
      if (!active) return;
      setAllSongs(list);
      // Make sure every song has its real download date before we rank them.
      backfillFileDates(list).catch(() => {});
    });
    return () => { active = false; };
  }, [visible]);

  const songs = useMemo(() => {
    const isArchived = useArchiveStore.getState().isArchived;
    const music = allSongs.filter(s => !isArchived(s));
    return sortByDownloadDate(
      filterByDownloadDate(music, dateFilter, downloadDates),
      'recent',
      downloadDates,
    );
  // archivedIds/unarchivedIds re-trigger the archive split.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSongs, dateFilter, downloadDates, archivedIds, unarchivedIds]);

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
            <Ionicons name="sparkles" size={20} color={palette.accent} />
            <View>
              <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>Recién agregadas</Text>
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
          <CompactSelector
            value={dateFilter}
            options={DATE_FILTER_OPTIONS}
            onChange={setDateFilter}
            title="Descargadas en"
            icon="calendar-outline"
          />
        </View>

        {songs.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="sparkles-outline" size={32} color={palette.accent} />
            </View>
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>Nada nuevo por aquí</Text>
            <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              No descargaste canciones en este periodo. Amplía el rango de fechas para ver más.
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
                <Text style={{ color: palette.textMuted, fontSize: 11, marginLeft: 8 }}>
                  {formatDownloadDate(getDownloadDate(item, downloadDates))}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 76, backgroundColor: palette.glass10 }} />}
            contentContainerStyle={{ paddingBottom: 120 }}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={11}
          />
          </>
        )}

        <DockedMiniPlayer onRequestClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
