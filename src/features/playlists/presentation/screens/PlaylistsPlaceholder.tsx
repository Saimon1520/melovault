import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  Switch, FlatList, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { PlaylistRepository } from '@/features/playlists/data/repositories/PlaylistRepository';
import { PlaylistDetailScreen } from './PlaylistDetailScreen';
import { ResponsivePane } from '@/shared/components/ResponsivePane';
import type { Playlist } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');
const repo = new PlaylistRepository();

// ── Create/Edit modal ────────────────────────────────────────────────────────
function PlaylistFormModal({
  visible, existing, onClose, onSave,
}: {
  visible: boolean;
  existing?: Playlist;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [keepPosition, setKeepPosition] = useState(existing?.keepPosition ?? false);

  useEffect(() => {
    if (visible) {
      setName(existing?.name ?? '');
      setDescription(existing?.description ?? '');
      setKeepPosition(existing?.keepPosition ?? false);
    }
  }, [visible, existing]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (existing) {
      await repo.update(existing.id, { name: name.trim(), description: description.trim(), keepPosition });
    } else {
      await repo.create(name.trim(), description.trim(), keepPosition);
    }
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.surface0, padding: 24, paddingTop: insets.top + 16 }}>
        <ResponsivePane maxWidth={560} style={{ flex: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '700' }}>
            {existing ? 'Editar playlist' : 'Nueva playlist'}
          </Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>NOMBRE</Text>
        <TextInput
          value={name} onChangeText={setName}
          placeholder="Mi playlist favorita"
          placeholderTextColor={palette.textMuted}
          style={{ backgroundColor: palette.surface2, color: palette.textPrimary, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 }}
          maxLength={60}
        />

        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>DESCRIPCIÓN (OPCIONAL)</Text>
        <TextInput
          value={description} onChangeText={setDescription}
          placeholder="Describe tu playlist..."
          placeholderTextColor={palette.textMuted}
          style={{ backgroundColor: palette.surface2, color: palette.textPrimary, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 24, height: 80, textAlignVertical: 'top' }}
          multiline maxLength={200}
        />

        {/* Persistence toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 12, padding: 16, marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '600' }}>Recordar posición</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>
              Guarda en qué canción y minuto te quedaste, sin importar cuánto tiempo pase
            </Text>
          </View>
          <Switch
            value={keepPosition} onValueChange={setKeepPosition}
            trackColor={{ false: palette.surface3, true: palette.accentDim }}
            thumbColor={keepPosition ? palette.accent : palette.textMuted}
          />
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 28, paddingHorizontal: 4 }}>
          Ideal para audiolibros, podcasts o playlists de trabajo
        </Text>

        <TouchableOpacity
          onPress={handleSave} disabled={!name.trim()}
          style={{ backgroundColor: name.trim() ? palette.accent : palette.surface2, borderRadius: 14, padding: 16, alignItems: 'center' }}
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {existing ? 'Guardar cambios' : 'Crear playlist'}
          </Text>
        </TouchableOpacity>
        </ResponsivePane>
      </View>
    </Modal>
  );
}

// ── Playlist card ────────────────────────────────────────────────────────────
function PlaylistCard({ playlist, onPress, onEdit, onDelete }: {
  playlist: Playlist;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
      accessibilityRole="button"
      accessibilityLabel={`Playlist ${playlist.name}, ${playlist.songCount ?? 0} canciones`}
    >
      <ExpoImage
        source={playlist.artworkPath ? { uri: playlist.artworkPath } : DEFAULT_ARTWORK}
        style={{ width: 56, height: 56, borderRadius: 10 }}
      />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
          {playlist.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            {playlist.songCount ?? 0} canciones
          </Text>
          {playlist.keepPosition && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.persistenceActive }} />
              <Text style={{ color: palette.persistenceActive, fontSize: 11 }}>Recuerda posición</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={onEdit}
        style={{ padding: 8 }}
        accessibilityRole="button" accessibilityLabel="Editar"
      >
        <Ionicons name="pencil-outline" size={18} color={palette.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        style={{ padding: 8 }}
        accessibilityRole="button" accessibilityLabel="Eliminar playlist"
      >
        <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export function PlaylistsPlaceholder() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | undefined>();
  const [openPlaylist, setOpenPlaylist] = useState<Playlist | null>(null);

  const loadPlaylists = useCallback(async () => {
    setPlaylists(await repo.getAll());
  }, []);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  const handleDelete = useCallback((playlist: Playlist) => {
    Alert.alert(
      'Eliminar playlist',
      `¿Eliminar "${playlist.name}"? Las canciones NO se borrarán del dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => { await repo.delete(playlist.id); loadPlaylists(); },
        },
      ],
    );
  }, [loadPlaylists]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 26, fontWeight: '800' }}>Playlists</Text>
        <TouchableOpacity
          onPress={() => { setEditingPlaylist(undefined); setShowForm(true); }}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: 18 }}
          accessibilityRole="button" accessibilityLabel="Nueva playlist"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {playlists.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="list" size={48} color={palette.accentSoft} />
          <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            Sin playlists aún
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            Crea tu primera playlist con el botón +
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <PlaylistCard
              playlist={item}
              onPress={() => setOpenPlaylist(item)}
              onEdit={() => { setEditingPlaylist(item); setShowForm(true); }}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 86, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <PlaylistFormModal
        visible={showForm}
        existing={editingPlaylist}
        onClose={() => setShowForm(false)}
        onSave={loadPlaylists}
      />

      <PlaylistDetailScreen
        playlist={openPlaylist}
        visible={openPlaylist !== null}
        onClose={() => setOpenPlaylist(null)}
        onChanged={loadPlaylists}
      />
    </SafeAreaView>
  );
}
