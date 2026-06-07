import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { formatTime } from '@/shared/utils/formatTime';
import type { Song } from '@/shared/types';

const DEFAULT_ARTWORK = require('@/assets/defaults/default-artwork.png');

interface SongListItemProps {
  song: Song;
  isPlaying?: boolean;
  onPress: (song: Song) => void;
  onLongPress?: (song: Song) => void;
}

export const SongListItem = memo(function SongListItem({
  song, isPlaying, onPress, onLongPress,
}: SongListItemProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(song)}
      onLongPress={() => onLongPress?.(song)}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: isPlaying ? 'rgba(124,92,252,0.08)' : 'transparent',
      }}
      accessibilityRole="button"
      accessibilityLabel={`${song.title} por ${song.artist}${isPlaying ? ', reproduciéndose ahora' : ''}`}
    >
      {/* Artwork */}
      <View style={{ position: 'relative' }}>
        <FastImage
          source={song.artworkPath ? { uri: song.artworkPath, cache: FastImage.cacheControl.immutable } : DEFAULT_ARTWORK}
          style={{ width: 48, height: 48, borderRadius: 8 }}
        />
        {isPlaying && (
          <View style={{
            position: 'absolute', inset: 0, borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="musical-note" size={18} color={palette.accent} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            color: isPlaying ? palette.accent : palette.textPrimary,
            fontWeight: isPlaying ? '600' : '500',
            fontSize: 15,
          }}
          numberOfLines={1}
        >
          {song.title || 'Sin título'}
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {song.artist || 'Artista desconocido'}
          {song.album ? ` • ${song.album}` : ''}
        </Text>
      </View>

      {/* Duration */}
      <Text style={{ color: palette.textMuted, fontSize: 12, marginHorizontal: 8 }}>
        {formatTime(song.duration)}
      </Text>

      {/* Menu */}
      <TouchableOpacity
        onPress={() => onLongPress?.(song)}
        style={{ padding: 8 }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Opciones"
      >
        <Ionicons name="ellipsis-vertical" size={16} color={palette.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prev, next) =>
  prev.song.id === next.song.id &&
  prev.isPlaying === next.isPlaying
);
