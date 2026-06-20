import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useActiveTrack } from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design-system/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsivePane } from '@/shared/components/ResponsivePane';
import { LRCLibService } from '@/infrastructure/lyrics/LRCLibService';
import { SongRepository } from '@/features/library/data/repositories/SongRepository';
import { useLyricsOffsetStore } from '@/features/lyrics/store/lyricsOffsetStore';
import { usePlayerProgress } from '@/features/player/presentation/hooks/usePlayerControls';

const repo = new SongRepository();

export function LyricsScreen({ songId, onClose }: { songId?: string; onClose: () => void }) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const activeTrack = useActiveTrack();
  const { position } = usePlayerProgress();
  // The `songId` prop is captured when the player opens and goes stale once the
  // queue advances — always trust the live active track id so the lyrics match
  // the song that's actually playing.
  const sid = activeTrack?.id != null ? String(activeTrack.id) : songId;
  const [lyrics, setLyrics] = useState<string>('');
  const [syncedLines, setSyncedLines] = useState<Array<{ timeMs: number; text: string }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [offsetText, setOffsetText] = useState('');
  const offsetFocused = useRef(false);

  const scrollRef = useRef<ScrollView>(null);
  const lineYs = useRef<number[]>([]);          // measured Y of each synced line
  const viewportH = useRef(0);                   // height of the scroll viewport
  const lastScrolledLine = useRef<number>(-1);

  // `background` upgrades plain → synced without showing the spinner (keeps the
  // already-visible lyrics in place until/unless synced ones arrive).
  const fetchFromLRCLib = useCallback(async (silent = false, background = false) => {
    if (!activeTrack) return;
    if (!background) setLoading(true);
    try {
      const result = await LRCLibService.searchLyrics(
        activeTrack.title ?? '',
        activeTrack.artist ?? '',
        activeTrack.album,
        activeTrack.duration,
      );
      if (result?.syncedLyrics) {
        setSyncedLines(LRCLibService.parseLRC(result.syncedLyrics));
        setLyrics(result.syncedLyrics);
        if (sid) await repo.updateLyrics(sid, result.plainLyrics ?? '', result.syncedLyrics);
      } else if (result?.plainLyrics) {
        setSyncedLines([]);
        setLyrics(result.plainLyrics);
        if (sid) await repo.updateLyrics(sid, result.plainLyrics);
      } else if (!silent) {
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
      if (!silent) Alert.alert('Error', 'No se pudo buscar letras. Revisa tu conexión.');
    }
    if (!background) setLoading(false);
  }, [activeTrack, sid]);

  // On open / track change: show saved lyrics instantly; otherwise fetch once.
  useEffect(() => {
    let active = true;
    setIsEditing(false);
    lineYs.current = [];
    lastScrolledLine.current = -1;
    (async () => {
      const song = sid ? await repo.getById(sid) : null;
      if (!active) return;
      if (song?.lyricsSynced) {
        setSyncedLines(LRCLibService.parseLRC(song.lyricsSynced));
        setLyrics(song.lyricsSynced);
      } else if (song?.lyrics) {
        setSyncedLines([]);
        setLyrics(song.lyrics);
        // We only have plain lyrics saved — try to upgrade to synced (karaoke)
        // in the background without disturbing the current view.
        if (activeTrack) fetchFromLRCLib(true, true);
      } else {
        setSyncedLines([]);
        setLyrics('');
        if (activeTrack) fetchFromLRCLib(true); // silent auto-fetch
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  // Karaoke: which line corresponds to the current playback position, shifted by
  // the user's manual sync offset (online LRC is timed for another version).
  const offset = useLyricsOffsetStore(s => (sid ? s.offsets[sid] ?? 0 : 0));
  const setOffset = useLyricsOffsetStore(s => s.setOffset);
  // Offset is a positive delay only (seconds the lyrics start later than the LRC).
  const applyOffset = (ms: number) => { if (sid) setOffset(sid, Math.max(0, Math.round(ms))); };
  const bumpOffset = (deltaMs: number) => applyOffset(offset + deltaMs);
  const resetOffset = () => { applyOffset(0); setOffsetText(''); };
  const commitOffsetText = (t: string) => {
    const cleaned = t.replace(',', '.').replace(/[^0-9.]/g, ''); // digits + dot, no sign
    setOffsetText(cleaned);
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) applyOffset(n * 1000);
  };
  // Keep the field in sync when the +/- buttons change the offset (not while typing).
  useEffect(() => {
    if (!offsetFocused.current) setOffsetText(offset ? (offset / 1000).toString() : '');
  }, [offset]);

  const posMs = position * 1000;
  const activeLineIndex = syncedLines.findLastIndex(l => l.timeMs <= posMs - offset);
  const activeLineIndexRef = useRef(-1);
  activeLineIndexRef.current = activeLineIndex;

  const scrollToLine = (idx: number, animated: boolean) => {
    const y = idx >= 0 ? lineYs.current[idx] : null;
    if (y == null || viewportH.current <= 0) return false;
    lastScrolledLine.current = idx;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewportH.current * 0.42), animated });
    return true;
  };

  // Center the active line using the measured offsets (reliable even when lines
  // wrap to multiple rows — fixed-height math would drift).
  useEffect(() => {
    if (activeLineIndex < 0 || activeLineIndex === lastScrolledLine.current) return;
    scrollToLine(activeLineIndex, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLineIndex]);

  // When synced lyrics first appear (modal opened), jump straight to where the
  // song already is — the line heights are measured asynchronously, so retry
  // until they're ready, then snap (no animation) to the current line.
  useEffect(() => {
    if (syncedLines.length === 0) return;
    let tries = 0;
    const id = setInterval(() => {
      if (scrollToLine(activeLineIndexRef.current, false) || ++tries > 15) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [syncedLines]);

  const handleSaveEdit = async () => {
    setSyncedLines([]);
    setLyrics(editText);
    setIsEditing(false);
    if (sid) await repo.updateLyrics(sid, editText);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.surface0, paddingTop: insets.top }}
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
            {activeTrack?.artist}{syncedLines.length > 0 ? '  •  Sincronizada' : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity
            onPress={() => fetchFromLRCLib(false)}
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
        <ScrollView
          ref={scrollRef}
          onLayout={(e) => { viewportH.current = e.nativeEvent.layout.height; }}
          contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {syncedLines.map((line, i) => {
            const dist = Math.abs(i - activeLineIndex);
            const isActive = i === activeLineIndex;
            return (
              <Text
                key={i}
                onLayout={(e) => { lineYs.current[i] = e.nativeEvent.layout.y; }}
                style={{
                  color: isActive ? '#fff' : palette.textMuted,
                  opacity: isActive ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.4 : 0.28,
                  fontSize: isActive ? 24 : 19,
                  fontWeight: isActive ? '800' : '500',
                  lineHeight: isActive ? 34 : 30,
                  textAlign: 'center',
                  marginVertical: 8,
                }}
              >
                {line.text}
              </Text>
            );
          })}
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : lyrics ? (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 18, lineHeight: 32, textAlign: 'center' }}>
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
              onPress={() => fetchFromLRCLib(false)}
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

      {/* Manual karaoke sync offset (per song, positive delay only) */}
      {syncedLines.length > 0 && !isEditing && !loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: palette.glass10 }}>
          <Ionicons name="sync-outline" size={16} color={palette.textMuted} />
          <TouchableOpacity
            onPress={() => bumpOffset(-500)}
            onLongPress={() => bumpOffset(-5000)}
            style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button" accessibilityLabel="Restar 0.5 segundos"
          >
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>−</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface2, borderRadius: 8, paddingHorizontal: 8, height: 34 }}>
            <TextInput
              value={offsetText}
              onChangeText={commitOffsetText}
              onFocus={() => { offsetFocused.current = true; }}
              onBlur={() => { offsetFocused.current = false; setOffsetText(offset ? (offset / 1000).toString() : ''); }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.textMuted}
              style={{ color: offset === 0 ? palette.textMuted : palette.accent, fontSize: 15, fontWeight: '700', minWidth: 38, textAlign: 'center', padding: 0 }}
            />
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>s</Text>
          </View>
          <TouchableOpacity
            onPress={() => bumpOffset(500)}
            onLongPress={() => bumpOffset(5000)}
            style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button" accessibilityLabel="Sumar 0.5 segundos"
          >
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700' }}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={resetOffset}
            disabled={offset === 0}
            style={{ width: 38, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button" accessibilityLabel="Reiniciar sincronía"
          >
            <Ionicons name="refresh" size={18} color={offset === 0 ? palette.surface3 : palette.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      </ResponsivePane>
    </KeyboardAvoidingView>
  );
}
