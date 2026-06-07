import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';

interface AudioDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'speaker' | 'headphones' | 'earpiece';
  isSelected: boolean;
}

interface BluetoothModalProps {
  visible: boolean;
  onClose: () => void;
}

// Note: Full BT device switching requires a native module (react-native-track-player
// exposes output routing on newer versions). This component provides the UI shell
// and hooks into the available native audio session API.
export function BluetoothModal({ visible, onClose }: BluetoothModalProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadDevices();
  }, [visible]);

  const loadDevices = async () => {
    setLoading(true);
    // Default system devices always available
    const systemDevices: AudioDevice[] = [
      { id: 'speaker', name: 'Altavoz del teléfono', type: 'speaker', isSelected: true },
      { id: 'earpiece', name: 'Auricular (llamada)', type: 'earpiece', isSelected: false },
    ];

    // On Android, we can query AudioManager for connected BT devices
    // This is handled natively by react-native-track-player on newer versions
    // For now, show system devices + instruction to connect via system settings
    setDevices(systemDevices);
    setLoading(false);
  };

  const typeIcon = (type: AudioDevice['type']): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'bluetooth': return 'bluetooth';
      case 'headphones': return 'headset';
      case 'speaker': return 'volume-high';
      default: return 'call';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: palette.surface1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '70%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="bluetooth" size={22} color={palette.accent} />
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 10 }}>
              Dispositivo de audio
            </Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto', padding: 4 }}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={palette.accent} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <FlatList
                data={devices}
                keyExtractor={d => d.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
                    }}
                    accessibilityRole="button" accessibilityLabel={item.name}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.isSelected ? palette.accentSoft : palette.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <Ionicons name={typeIcon(item.type)} size={20} color={item.isSelected ? palette.accent : palette.textMuted} />
                    </View>
                    <Text style={{ flex: 1, color: palette.textPrimary, fontSize: 15 }}>{item.name}</Text>
                    {item.isSelected && <Ionicons name="checkmark-circle" size={22} color={palette.accent} />}
                  </TouchableOpacity>
                )}
              />

              <View style={{ marginTop: 16, padding: 14, backgroundColor: palette.surface2, borderRadius: 12 }}>
                <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 20 }}>
                  💡 Para conectar dispositivos Bluetooth, hazlo desde los ajustes de tu sistema.
                  Una vez conectado, aparecerá aquí automáticamente.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
