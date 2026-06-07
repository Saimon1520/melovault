import React from 'react';
import { View, Text } from 'react-native';
import { palette } from '@/design-system/tokens/colors';

export function SettingsPlaceholder() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: '700' }}>Ajustes</Text>
      <Text style={{ color: palette.textMuted, marginTop: 8 }}>Configuración — Fase 2</Text>
    </View>
  );
}
