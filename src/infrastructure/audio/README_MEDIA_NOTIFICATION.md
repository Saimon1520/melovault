# Media Notification — Cómo funciona en MeloVault

## ¿Qué es?

Cuando MeloVault reproduce música, aparece automáticamente en:

### Android
1. **Barra de notificaciones** — Al deslizar hacia abajo aparece la notificación con:
   - Portada del álbum
   - Título y artista
   - Botones: Anterior ⏮ · Play/Pause ⏸ · Siguiente ⏭
   - Barra de progreso

2. **Panel de accesos rápidos** (el que mencionas — swipe down dos veces) — 
   Android 13+ muestra un widget de media player compacto con los 3 botones principales

3. **Pantalla bloqueada** — Controles visibles sin desbloquear el teléfono

4. **Auriculares Bluetooth** — Los botones físicos del headset controlan MeloVault

### iOS
1. **Control Center** — Swipe desde esquina superior derecha
2. **Lock Screen** — Controles en pantalla bloqueada
3. **AirPlay** — Selector de dispositivo de audio

---

## Pausa automática al desconectar auriculares

MeloVault pausa automáticamente cuando:
- Se desconectan los **audífonos con cable** (jack 3.5mm o USB-C)
- Se desconectan los **auriculares Bluetooth**
- Una **llamada telefónica** interrumpe la reproducción
- Una **alarma** u otra app toma el audio

Cuando la interrupción termina, MeloVault retoma la reproducción si es apropiado.

---

## Implementación técnica

Manejado en `playbackService.ts` via:
- `Event.RemoteDuck` — desconexión de auriculares + pérdida de audio focus
- `autoHandleInterruptions: true` en `TrackPlayer.setupPlayer()` — manejo automático
- Android: `ACTION_AUDIO_BECOMING_NOISY` broadcast via react-native-track-player
- iOS: `AVAudioSession` interruption notifications via react-native-track-player

---

## Permisos necesarios (Android)

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

Y el servicio declarado con `android:foregroundServiceType="mediaPlayback"`.
