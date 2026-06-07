import React from 'react';
import { View, Text } from 'react-native';
import { palette } from '@/design-system/tokens/colors';

export function PlaylistsPlaceholder() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: '700' }}>Playlists</Text>
      <Text style={{ color: palette.textMuted, marginTop: 8 }}>Gestión de playlists — Fase 2</Text>
    </View>
  );
}
