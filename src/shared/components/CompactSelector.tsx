import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';

export interface SelectorOption<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface CompactSelectorProps<T> {
  value: T;
  options: SelectorOption<T>[];
  onChange: (v: T) => void;
  /** Title shown at the top of the bottom sheet. */
  title?: string;
  /** Optional leading icon on the trigger chip. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Override the chip text (defaults to the selected option's label). */
  triggerLabel?: string;
  minTriggerWidth?: number;
}

/**
 * A compact, Spotify-style single-control selector: a small chip showing the
 * current value that opens a bottom sheet with the full list of options (the
 * selected one checked). Replaces sprawling rows of toggle buttons.
 */
export function CompactSelector<T extends string | number>({
  value, options, onChange, title, icon, triggerLabel, minTriggerWidth,
}: CompactSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
          backgroundColor: palette.surface2, minWidth: minTriggerWidth,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${title ?? ''}: ${current?.label ?? ''}`}
      >
        {icon && <Ionicons name={icon} size={15} color={palette.accent} />}
        <Text style={{ color: palette.textPrimary, fontSize: 13, fontWeight: '600' }}>
          {triggerLabel ?? current?.label ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={14} color={palette.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Tap the scrim to dismiss; inner press is swallowed so taps on the
            sheet don't close it. */}
        <TouchableOpacity
          activeOpacity={1} onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1} onPress={() => {}}
            style={{
              backgroundColor: palette.surface1,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 16,
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.surface3 }} />
            </View>
            {title && (
              <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
                {title}
              </Text>
            )}
            <ScrollView style={{ maxHeight: 380 }} bounces={false}>
              {options.map(opt => {
                const selected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    onPress={() => { onChange(opt.value); setOpen(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: selected ? palette.accent : palette.textPrimary, fontSize: 15, fontWeight: selected ? '700' : '500' }}>
                        {opt.label}
                      </Text>
                      {opt.sublabel && (
                        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{opt.sublabel}</Text>
                      )}
                    </View>
                    {selected && <Ionicons name="checkmark" size={20} color={palette.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
