import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { palette } from '@/design-system/tokens/colors';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { PlaylistRepository } from '@/features/playlists/data/repositories/PlaylistRepository';
import { TrackPlayerService } from '@/infrastructure/audio/TrackPlayerService';
import { FileSystemService } from '@/infrastructure/filesystem/FileSystemService';
import { ArtworkPicker } from '@/features/library/presentation/components/ArtworkPicker';
import { ResponsivePane } from '@/shared/components/ResponsivePane';
import { usePositionMemoryStore } from '@/features/player/store/positionMemoryStore';
import { useArchiveStore } from '@/features/library/store/archiveStore';
import { useFavoritesStore } from '@/features/player/store/favoritesStore';
import type { Song, Playlist } from '@/shared/types';
import { formatTime, formatFileSize } from '@/shared/utils/formatTime';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');
const songRepo = new SongRepository();
const playlistRepo = new PlaylistRepository();

interface SongOptionsModalProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
  onSongDeleted?: (songId: string) => void;
  onSongHidden?: (songId: string) => void;
}

export function SongOptionsModal({ song, visible, onClose, onSongDeleted, onSongHidden }: SongOptionsModalProps) {
  const insets = useSafeAreaInsets();
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showArtworkPicker, setShowArtworkPicker] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(song);
  const [rememberPosition, setRememberPosition] = useState(false);
  const [inheritedFromPlaylist, setInheritedFromPlaylist] = useState(false);

  useEffect(() => {
    if (visible && song) {
      playlistRepo.getAll().then(setPlaylists);
      setShowPlaylists(false);
      setShowInfo(false);
      setShowArtworkPicker(false);
      setCurrentSong(song);
      setRememberPosition(usePositionMemoryStore.getState().isRemembered(song.id));
      playlistRepo.songIsInKeepPositionPlaylist(song.id).then(setInheritedFromPlaylist);
    }
  }, [visible, song]);

  const toggleRememberPosition = async (value: boolean) => {
    if (!song) return;
    setRememberPosition(value);
    usePositionMemoryStore.getState().setRemembered(song.id, value);
    if (!value) await songRepo.clearPosition(song.id); // forget saved spot
  };

  if (!song) return null;

  const handleAddToPlaylist = async (playlist: Playlist) => {
    await playlistRepo.addSong(playlist.id, song.id);
    onClose();
  };

  const handleHide = () => {
    Alert.alert(
      'Ocultar canción',
      `"${song.title}" se ocultará de la app. El archivo NO se eliminará del dispositivo. Puedes volver a mostrarlo desde Ajustes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar', style: 'destructive',
          onPress: async () => {
            await songRepo.hideSong(song.id);
            onClose();
            onSongHidden?.(song.id);
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar canción permanentemente',
      `"${song.title}" se eliminará del dispositivo. Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const result = await FileSystemService.deleteSongFile(song.filePath, song.title);
            if (result.success) {
              await songRepo.deleteSongFromDB(song.id);
              onClose();
              onSongDeleted?.(song.id);
            }
          },
        },
      ],
    );
  };

  const extraFields = song.extraMetadata
    ? Object.entries(song.extraMetadata).filter(([, v]) => v && v.trim() !== '')
    : [];
  const songArchived = useArchiveStore.getState().isArchived(song);
  const songFavorite = useFavoritesStore.getState().isFavorite(song.id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.surface0, paddingTop: insets.top }}>
       <ResponsivePane>
        {/* Song header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <ExpoImage
            source={song.artworkPath ? { uri: song.artworkPath } : DEFAULT_ARTWORK}
            style={{ width: 52, height: 52, borderRadius: 10 }}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{song.title}</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{song.artist}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Remember playback position (per-song opt-in) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="bookmark-outline" size={18} color={palette.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textPrimary, fontSize: 16 }}>Recordar posición</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                {inheritedFromPlaylist
                  ? 'Activado por una playlist que recuerda posición'
                  : 'Retomar donde lo dejaste al volver a reproducir'}
              </Text>
            </View>
            <Switch
              value={rememberPosition || inheritedFromPlaylist}
              onValueChange={toggleRememberPosition}
              disabled={inheritedFromPlaylist}
              trackColor={{ false: palette.surface3, true: palette.accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Main actions */}
          {[
            songFavorite
              ? { icon: 'heart' as const, label: 'Quitar de favoritos', onPress: () => { useFavoritesStore.getState().toggleFavorite(song.id); onClose(); }, color: palette.accent }
              : { icon: 'heart-outline' as const, label: 'Agregar a favoritos', onPress: () => { useFavoritesStore.getState().toggleFavorite(song.id); onClose(); } },
            { icon: 'play-forward-outline' as const, label: 'Agregar a la cola', onPress: async () => { await TrackPlayerService.getInstance().addToQueue(song); onClose(); } },
            { icon: 'list-outline' as const, label: 'Agregar a playlist', onPress: () => setShowPlaylists(v => !v) },
            { icon: 'image-outline' as const, label: 'Cambiar portada', onPress: () => setShowArtworkPicker(true) },
            { icon: 'information-circle-outline' as const, label: 'Ver información', onPress: () => setShowInfo(v => !v) },
            songArchived
              ? { icon: 'arrow-undo-outline' as const, label: 'Quitar de archivados', onPress: () => { useArchiveStore.getState().setArchived(song.id, false); onClose(); } }
              : { icon: 'archive-outline' as const, label: 'Archivar (no es música)', onPress: () => { useArchiveStore.getState().setArchived(song.id, true); onClose(); } },
            { icon: 'eye-off-outline' as const, label: 'Ocultar canción', onPress: handleHide, color: palette.warning },
            { icon: 'trash-outline' as const, label: 'Eliminar del dispositivo', onPress: handleDelete, color: palette.error },
          ].map(({ icon, label, onPress, color }) => (
            <TouchableOpacity
              key={label} onPress={onPress}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}
              accessibilityRole="button" accessibilityLabel={label}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name={icon} size={18} color={color ?? palette.textSecondary} />
              </View>
              <Text style={{ color: color ?? palette.textPrimary, fontSize: 16 }}>{label}</Text>
              {label === 'Agregar a playlist' && <Ionicons name={showPlaylists ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textMuted} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}

          {/* Playlist picker */}
          {showPlaylists && (
            <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: palette.surface2, borderRadius: 14, overflow: 'hidden' }}>
              {playlists.length === 0 ? (
                <Text style={{ color: palette.textMuted, padding: 16, textAlign: 'center' }}>No hay playlists. Crea una primero.</Text>
              ) : playlists.map(p => (
                <TouchableOpacity
                  key={p.id} onPress={() => handleAddToPlaylist(p)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                  accessibilityRole="button" accessibilityLabel={`Agregar a ${p.name}`}
                >
                  <Ionicons name="list" size={18} color={palette.accent} />
                  <Text style={{ color: palette.textPrimary, marginLeft: 12, fontSize: 15 }}>{p.name}</Text>
                  {p.keepPosition && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.persistenceActive, marginLeft: 8 }} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Info panel */}
          {showInfo && (
            <View style={{ marginHorizontal: 20, backgroundColor: palette.surface2, borderRadius: 14, padding: 16 }}>
              <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>INFORMACIÓN</Text>
              {[
                ['Título', song.title],
                ['Artista', song.artist],
                ['Álbum', song.album],
                ['Año', song.year],
                ['Género', song.genre],
                ['Disquera', song.label],
                ['Compositor', song.composer],
                ['Duración', formatTime(song.duration)],
                ['Tamaño', song.fileSize ? formatFileSize(song.fileSize) : null],
                ['Bitrate', song.bitRate ? `${song.bitRate} kbps` : null],
                ['Sample rate', song.sampleRate ? `${song.sampleRate} Hz` : null],
                ['Pista', song.trackNumber ? String(song.trackNumber) : null],
                ['Fuente', song.source],
                ['Archivo', song.filePath],
                ...extraFields,
              ].filter(([, v]) => v).map(([label, value]) => (
                <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: palette.textMuted, fontSize: 13, flexShrink: 0, marginRight: 8 }}>{label}</Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 13, flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
       </ResponsivePane>
      </View>

      {/* Artwork picker nested modal */}
      {currentSong && (
        <ArtworkPicker
          song={currentSong}
          visible={showArtworkPicker}
          onClose={() => setShowArtworkPicker(false)}
          onArtworkUpdated={(path) => setCurrentSong(prev => prev ? { ...prev, artworkPath: path } : prev)}
        />
      )}
    </Modal>
  );
}
