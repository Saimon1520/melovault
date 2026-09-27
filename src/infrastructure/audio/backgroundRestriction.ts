import { Alert, NativeModules, Platform } from 'react-native';

// With the app's battery usage set to "Restricted" (by the user or an OEM battery
// manager such as Motorola's), Android stops the playback service the moment the
// app leaves the screen — the music cuts out and no code can prevent it. All we
// can do is notice it and point the user at the setting. Asked at most once per
// app session so it never nags; apps that aren't restricted never see it.
let warnedThisSession = false;

export async function warnIfBackgroundRestricted(): Promise<void> {
  if (Platform.OS !== 'android' || warnedThisSession) return;
  const AudioControl = NativeModules.AudioControl;
  let restricted = false;
  try {
    restricted = !!(await AudioControl?.isBackgroundRestricted?.());
  } catch {
    return;
  }
  if (!restricted) return;
  warnedThisSession = true;
  Alert.alert(
    'La música se cortará en segundo plano',
    'El uso de batería de MeloVault está en "Restringido", así que Android detiene la música cuando sales de la app.\n\n' +
      'Para que siga sonando: Ajustes de la app → Batería → elige "Optimizado" o "Sin restricciones".',
    [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => AudioControl?.openAppSettings?.() },
    ],
  );
}
