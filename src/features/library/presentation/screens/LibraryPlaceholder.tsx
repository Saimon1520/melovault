import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { useLibraryScan } from '../hooks/useLibrary';

type Tab = { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

const TABS: Tab[] = [
  { key: 'songs', label: 'Canciones', icon: 'musical-note' },
  { key: 'albums', label: 'Álbumes', icon: 'disc' },
  { key: 'artists', label: 'Artistas', icon: 'person' },
  { key: 'genres', label: 'Géneros', icon: 'pricetag' },
  { key: 'folders', label: 'Carpetas', icon: 'folder' },
];

export function LibraryPlaceholder() {
  const { isScanning, scanProgress, startScan } = useLibraryScan();
  const [activeTab, setActiveTab] = React.useState('songs');

  const handleScan = useCallback(async () => {
    const result = await startScan();
    if (result?.success) {
      const { added, skipped, total } = result.data;
      console.log(`Scan complete: ${added} added, ${skipped} skipped of ${total} total`);
    }
  }, [startScan]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface0 }}>
      <StatusBar barStyle="light-content" backgroundColor={palette.surface0} />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}>
        <Text style={{ color: palette.textPrimary, fontSize: 28, fontWeight: '800' }}>
          MeloVault
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surface2,
              borderRadius: 20,
            }}
            accessibilityRole="button"
            accessibilityLabel="Buscar canciones"
          >
            <Ionicons name="search" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleScan}
            disabled={isScanning}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isScanning ? palette.accentSoft : palette.surface2,
              borderRadius: 20,
            }}
            accessibilityRole="button"
            accessibilityLabel={isScanning ? 'Escaneando biblioteca...' : 'Escanear música del dispositivo'}
          >
            {isScanning
              ? <ActivityIndicator size="small" color={palette.accent} />
              : <Ionicons name="refresh" size={20} color={palette.textSecondary} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Scan progress */}
      {isScanning && scanProgress && (
        <View style={{
          marginHorizontal: 20,
          marginBottom: 8,
          backgroundColor: palette.surface2,
          borderRadius: 12,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
              Escaneando archivos de audio...
            </Text>
            <Text style={{ color: palette.accent, fontSize: 12 }}>
              {scanProgress.scanned} / {scanProgress.total || '?'}
            </Text>
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 11 }} numberOfLines={1}>
            {scanProgress.currentFile}
          </Text>
          {scanProgress.total > 0 && (
            <View style={{ height: 2, backgroundColor: palette.surface3, borderRadius: 1, marginTop: 6 }}>
              <View style={{
                height: '100%',
                width: `${(scanProgress.scanned / scanProgress.total) * 100}%`,
                backgroundColor: palette.accent,
                borderRadius: 1,
              }} />
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeTab === tab.key ? palette.accentSoft : palette.surface2,
              borderWidth: 1,
              borderColor: activeTab === tab.key ? palette.accent : 'transparent',
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? palette.accent : palette.textMuted}
            />
            <Text style={{
              color: activeTab === tab.key ? palette.accent : palette.textMuted,
              fontSize: 13,
              fontWeight: '500',
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Empty state — shown before first scan */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: palette.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Ionicons name="musical-notes" size={36} color={palette.accent} />
        </View>
        <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          Tu música, tu control
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          Toca el botón de escanear para encontrar todos los archivos de audio en tu dispositivo
        </Text>
        <TouchableOpacity
          onPress={handleScan}
          disabled={isScanning}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 14,
            backgroundColor: palette.accent,
            borderRadius: 30,
          }}
          accessibilityRole="button"
          accessibilityLabel="Escanear música del dispositivo"
        >
          <Ionicons name="scan" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            Escanear música
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
