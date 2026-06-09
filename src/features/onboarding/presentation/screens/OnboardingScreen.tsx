import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Platform, PermissionsAndroid, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library/legacy';
import { palette } from '@/design-system/tokens/colors';
import { ScanLibraryUseCase, type ScanResult } from '@/features/library/domain/usecases/ScanLibraryUseCase';
import type { ScanProgress } from '@/infrastructure/filesystem/MediaScanner';

let _scanUseCase: ScanLibraryUseCase | null = null;
function getScanUseCase() {
  if (!_scanUseCase) _scanUseCase = new ScanLibraryUseCase();
  return _scanUseCase;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'permissions' | 'scanning' | 'done';

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanCount, setScanCount] = useState(0);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO!,
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permiso requerido',
            'MeloVault necesita acceso a tus archivos de audio. Ve a Ajustes > Permisos > Almacenamiento para habilitarlo.',
            [{ text: 'OK' }],
          );
          return;
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Sin acceso al almacenamiento no se pueden mostrar tus canciones.');
          return;
        }
      }
    } else {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
    setStep('scanning');
    await startScan();
  };

  const startScan = async () => {
    try {
      const result = await getScanUseCase().execute((progress: ScanProgress) => {
        setScanProgress(progress.scanned);
        setScanTotal(progress.total);
        setScanCount(progress.scanned);
      });
      if (result.success) {
        setScanCount(result.data?.total ?? 0);
      }
      setStep('done');
    } catch (e) {
      Alert.alert('Error al escanear', 'No se pudieron cargar los archivos de audio. Puedes intentarlo de nuevo desde Ajustes.');
      setStep('done');
    }
  };

  const progressPct = scanTotal > 0 ? Math.round((scanProgress / scanTotal) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      {step === 'welcome' && (
        <>
          <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <Ionicons name="musical-notes" size={52} color={palette.accent} />
          </View>
          <Text style={{ color: palette.textPrimary, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
            Bienvenido a MeloVault
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 }}>
            Tu música local, sin publicidad, sin límites. Reproduce, organiza y disfruta tu biblioteca personal.
          </Text>
          <TouchableOpacity
            onPress={() => setStep('permissions')}
            style={{ paddingHorizontal: 40, paddingVertical: 16, backgroundColor: palette.accent, borderRadius: 30 }}
            accessibilityRole="button" accessibilityLabel="Comenzar"
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Comenzar</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'permissions' && (
        <>
          <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,200,0,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="folder-open" size={44} color="#FFC947" />
          </View>
          <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            Acceso a tus archivos
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Necesitamos permiso para leer tus archivos de audio. Tus canciones nunca se subirán a ningún servidor.
          </Text>
          {[
            { icon: 'musical-note' as const, text: 'Escanear MP3, FLAC, WAV y más' },
            { icon: 'lock-closed' as const, text: 'Solo lectura — nunca borramos sin tu confirmación' },
            { icon: 'cloud-offline' as const, text: '100% offline — sin internet requerido' },
          ].map(({ icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, width: '100%' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name={icon} size={18} color={palette.accent} />
              </View>
              <Text style={{ flex: 1, color: palette.textSecondary, fontSize: 14 }}>{text}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={requestPermissions}
            style={{ marginTop: 24, paddingHorizontal: 40, paddingVertical: 16, backgroundColor: palette.accent, borderRadius: 30 }}
            accessibilityRole="button" accessibilityLabel="Dar permiso y escanear música"
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Dar permiso y escanear</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'scanning' && (
        <>
          <ActivityIndicator size="large" color={palette.accent} style={{ marginBottom: 28 }} />
          <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
            Escaneando música...
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
            {scanTotal > 0 ? `${scanCount} / ${scanTotal} archivos` : 'Buscando archivos de audio...'}
          </Text>
          {scanTotal > 0 && (
            <View style={{ width: '100%', height: 6, backgroundColor: palette.surface2, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progressPct}%`, backgroundColor: palette.accent, borderRadius: 3 }} />
            </View>
          )}
          <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 12 }}>
            {progressPct}%
          </Text>
        </>
      )}

      {step === 'done' && (
        <>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0, 201, 167, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="checkmark-circle" size={52} color={palette.persistenceActive} />
          </View>
          <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            ¡Todo listo!
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            {scanCount > 0
              ? `Se encontraron ${scanCount} canciones. Puedes volver a escanear cuando quieras desde Ajustes.`
              : 'No se encontraron canciones. Agrega archivos de audio a tu dispositivo y vuelve a escanear desde Ajustes.'}
          </Text>
          <TouchableOpacity
            onPress={onComplete}
            style={{ paddingHorizontal: 40, paddingVertical: 16, backgroundColor: palette.accent, borderRadius: 30 }}
            accessibilityRole="button" accessibilityLabel="Ir a mi biblioteca"
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Ir a mi biblioteca</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
