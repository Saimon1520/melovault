import React from 'react';
import { View, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import type { Song } from '@/shared/types';

const repo = new SongRepository();
const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface ArtworkPickerProps {
  song: Song;
  visible: boolean;
  onClose: () => void;
  onArtworkUpdated: (artworkPath: string) => void;
}

export function ArtworkPicker({ song, visible, onClose, onArtworkUpdated }: ArtworkPickerProps) {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para elegir una portada.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      await repo.updateArtwork(song.id, uri);
      onArtworkUpdated(uri);
      onClose();
    }
  };

  const removeArtwork = () => {
    Alert.alert(
      'Eliminar portada',
      '¿Eliminar la portada personalizada de esta canción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await repo.updateArtwork(song.id, '');
            onArtworkUpdated('');
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>
              Portada del álbum
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Current artwork preview */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <ExpoImage
              source={song.artworkPath ? { uri: song.artworkPath } : DEFAULT_ARTWORK}
              style={{ width: 120, height: 120, borderRadius: 16 }}
            />
            <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 8 }}>
              {song.artworkPath ? 'Portada actual' : 'Sin portada'}
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={pickImage}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
            accessibilityRole="button" accessibilityLabel="Elegir imagen de la galería"
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="image-outline" size={20} color={palette.accent} />
            </View>
            <Text style={{ color: palette.textPrimary, fontSize: 16 }}>Elegir de la galería</Text>
          </TouchableOpacity>

          {song.artworkPath ? (
            <TouchableOpacity
              onPress={removeArtwork}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              accessibilityRole="button" accessibilityLabel="Eliminar portada"
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,107,107,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="trash-outline" size={20} color={palette.error} />
              </View>
              <Text style={{ color: palette.error, fontSize: 16 }}>Eliminar portada</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
