import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';

type DeviceType = 'bluetooth' | 'wired' | 'usb' | 'speaker';

interface AudioDevice {
  id: string;
  name: string;
  type: DeviceType;
  isSelected: boolean;
}

interface BluetoothModalProps {
  visible: boolean;
  onClose: () => void;
}

const AudioControl: {
  getOutputDevices(): Promise<{ id: number; name: string; type: DeviceType; bluetooth: boolean }[]>;
  openBluetoothSettings(): void;
} | undefined = NativeModules.AudioControl;

// Android routes media to the highest-priority connected output automatically
// (Bluetooth > USB > wired > speaker), so we surface the real device list from
// AudioManager and mark which one is currently active.
const PRIORITY: DeviceType[] = ['bluetooth', 'usb', 'wired', 'speaker'];

export function BluetoothModal({ visible, onClose }: BluetoothModalProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const native = (await AudioControl?.getOutputDevices()) ?? [];
      const list: AudioDevice[] = native.length
        ? native.map(d => ({ id: String(d.id), name: d.name, type: d.type, isSelected: false }))
        : [{ id: 'speaker', name: 'Altavoz del teléfono', type: 'speaker', isSelected: true }];

      // Mark the active output (highest-priority connected device).
      const active = PRIORITY.find(t => list.some(d => d.type === t));
      let marked = false;
      for (const d of list) {
        d.isSelected = !marked && d.type === active;
        if (d.isSelected) marked = true;
      }
      setDevices(list);
    } catch {
      setDevices([{ id: 'speaker', name: 'Altavoz del teléfono', type: 'speaker', isSelected: true }]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) loadDevices();
  }, [visible, loadDevices]);

  const typeIcon = (type: DeviceType): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'bluetooth': return 'bluetooth';
      case 'wired': return 'headset';
      case 'usb': return 'hardware-chip';
      default: return 'volume-high';
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

              <TouchableOpacity
                onPress={() => AudioControl?.openBluetoothSettings()}
                style={{ marginTop: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, backgroundColor: palette.accentSoft, borderRadius: 12 }}
                accessibilityRole="button"
              >
                <Ionicons name="bluetooth" size={18} color={palette.accent} />
                <Text style={{ color: palette.accent, fontSize: 14, fontWeight: '600' }}>Conectar dispositivo Bluetooth</Text>
              </TouchableOpacity>
              <View style={{ marginTop: 8, padding: 12, backgroundColor: palette.surface2, borderRadius: 12 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18 }}>
                  💡 El audio se enruta automáticamente al dispositivo Bluetooth conectado.
                </Text>
              </View>
              <TouchableOpacity onPress={loadDevices} style={{ marginTop: 8, alignSelf: 'center', padding: 6 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Actualizar lista</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
