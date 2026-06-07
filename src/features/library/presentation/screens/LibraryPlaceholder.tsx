import React from 'react';
import { View, Text } from 'react-native';
import { palette } from '@/design-system/tokens/colors';

export function LibraryPlaceholder() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: '700' }}>MeloVault</Text>
      <Text style={{ color: palette.textMuted, marginTop: 8 }}>Biblioteca — Fase 2</Text>
    </View>
  );
}
