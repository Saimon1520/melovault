import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useActiveTrack } from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/design-system/tokens/colors';
import { ResponsivePane } from '@/shared/components/ResponsivePane';
import { LRCLibService } from '@/infrastructure/lyrics/LRCLibService';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { usePlayerProgress } from '@/features/player/presentation/hooks/usePlayerControls';

const repo = new SongRepository();

export function LyricsScreen({ songId, onClose }: { songId?: string; onClose: () => void }) {
  const activeTrack = useActiveTrack();
  const { position } = usePlayerProgress();
  const [lyrics, setLyrics] = useState<string>('');
  const [syncedLines, setSyncedLines] = useState<Array<{ timeMs: number; text: string }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const activeLineRef = useRef<number>(-1);

  useEffect(() => {
    if (!activeTrack) return;
    // Load lyrics from DB if we have a songId
    setLyrics('');
    setSyncedLines([]);
  }, [activeTrack?.id]);

  const fetchFromLRCLib = useCallback(async () => {
    if (!activeTrack) return;
    setLoading(true);
    try {
      const result = await LRCLibService.searchLyrics(
        activeTrack.title ?? '',
        activeTrack.artist ?? '',
        activeTrack.album,
        activeTrack.duration,
      );
      if (result?.syncedLyrics) {
        const lines = LRCLibService.parseLRC(result.syncedLyrics);
        setSyncedLines(lines);
        setLyrics(result.syncedLyrics);
        if (songId) await repo.updateLyrics(songId, result.plainLyrics ?? '', result.syncedLyrics);
      } else if (result?.plainLyrics) {
        setLyrics(result.plainLyrics);
        if (songId) await repo.updateLyrics(songId, result.plainLyrics);
      } else {
        // Keep the empty state (with the write/paste action) and let the user
        // know, instead of overwriting the view with an error string.
        Alert.alert(
          'Sin resultados',
          'No se encontraron letras online. Puedes pegarlas tú mismo (por ejemplo, copiadas de tu navegador).',
          [
            { text: 'Cerrar', style: 'cancel' },
            { text: 'Escribir/Pegar', onPress: () => { setEditText(''); setIsEditing(true); } },
          ],
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo buscar letras. Revisa tu conexión.');
    }
    setLoading(false);
  }, [activeTrack, songId]);

  // Auto-scroll to active lyric line
  const posMs = position * 1000;
  const activeLineIndex = syncedLines.findLastIndex(l => l.timeMs <= posMs);

  useEffect(() => {
    if (activeLineIndex !== activeLineRef.current && activeLineIndex >= 0) {
      activeLineRef.current = activeLineIndex;
      scrollRef.current?.scrollTo({ y: activeLineIndex * 44 - 100, animated: true });
    }
  }, [activeLineIndex]);

  const handleSaveEdit = async () => {
    setLyrics(editText);
    setIsEditing(false);
    if (songId) await repo.updateLyrics(songId, editText);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.surface0 }}
    >
      <ResponsivePane maxWidth={680}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20 }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Cerrar letras">
          <Ionicons name="chevron-down" size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
            {activeTrack?.title ?? 'Letras'}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
            {activeTrack?.artist}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity
            onPress={fetchFromLRCLib}
            style={{ padding: 8 }}
            accessibilityRole="button" accessibilityLabel="Buscar letras online"
          >
            <Ionicons name="cloud-download-outline" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setIsEditing(v => !v); setEditText(lyrics); }}
            style={{ padding: 8 }}
            accessibilityRole="button" accessibilityLabel={isEditing ? 'Cancelar edición' : 'Editar letras'}
          >
            <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity
              onPress={handleSaveEdit}
              style={{ padding: 8 }}
              accessibilityRole="button" accessibilityLabel="Guardar letras"
            >
              <Ionicons name="checkmark" size={20} color={palette.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.accent} />
          <Text style={{ color: palette.textMuted, marginTop: 12 }}>Buscando letras...</Text>
        </View>
      ) : isEditing ? (
        <TextInput
          value={editText} onChangeText={setEditText}
          multiline
          style={{ flex: 1, color: palette.textPrimary, fontSize: 16, lineHeight: 26, padding: 20, textAlignVertical: 'top' }}
          placeholder="Escribe o pega las letras aquí..."
          placeholderTextColor={palette.textMuted}
        />
      ) : syncedLines.length > 0 ? (
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
          {syncedLines.map((line, i) => (
            <Text
              key={i}
              style={{
                color: i === activeLineIndex ? palette.textPrimary : palette.textMuted,
                fontSize: i === activeLineIndex ? 20 : 17,
                fontWeight: i === activeLineIndex ? '700' : '400',
                lineHeight: 44,
                textAlign: 'center',
                transform: [{ scale: i === activeLineIndex ? 1.05 : 1 }],
              }}
            >
              {line.text}
            </Text>
          ))}
        </ScrollView>
      ) : lyrics ? (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 17, lineHeight: 30, textAlign: 'center' }}>
            {lyrics}
          </Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="musical-note" size={48} color={palette.accentSoft} />
          <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Sin letras</Text>
          <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            Búscalas online, o pégalas tú mismo desde tu navegador.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              onPress={fetchFromLRCLib}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: palette.accent, borderRadius: 24 }}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600' }}>Buscar online</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setEditText(''); setIsEditing(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: palette.surface2, borderRadius: 24 }}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={18} color={palette.textSecondary} />
              <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>Escribir/Pegar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </ResponsivePane>
    </KeyboardAvoidingView>
  );
}
