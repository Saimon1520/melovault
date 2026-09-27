# Reproducción en segundo plano y notificación — cómo funciona en MeloVault

La música la reproduce el `MusicService` de react-native-track-player (RNTP 4.1.2,
sobre ExoPlayer vía `kotlinaudio`). Mientras suena, ese servicio **debe** estar en
**primer plano** (foreground service de tipo `mediaPlayback`) con la notificación
multimedia. Es lo que:

- muestra los controles en la cortina, el panel de ajustes rápidos, la pantalla de
  bloqueo y responde a los botones de auriculares Bluetooth;
- mantiene al proceso con prioridad alta (`oom_adj` 50–200). Sin primer plano el
  proceso baja a prioridad de app en caché (`oom_adj` 700) y el *low-memory killer*
  lo mata en cuanto falta RAM: la música se corta de golpe y al volver la app
  arranca en frío.

Varias piezas de MeloVault existen para que eso no pase, ni siquiera en un
teléfono de gama baja (4 GB de RAM, almacenamiento lleno).

---

## 1. Parche de RNTP (`patches/react-native-track-player@4.1.2.patch`)

Todo en `MusicService.kt`, comentado con `MeloVault:`.

| Problema de RNTP original | Arreglo |
|---|---|
| `onStartCommand` (lo dispara, p. ej., un botón multimedia Bluetooth o un reinicio `START_STICKY`) hacía `startForeground(vacía)` + `stopForeground()` y **sacaba del primer plano** al servicio aunque estuviera sonando. | Si `playWhenReady`, se vuelve a llamar `startForeground` con la notificación multimedia real (`startForegroundWithMediaNotification`). |
| Con `stopForegroundGracePeriod: 0`, cualquier estado momentáneo "no activo" (seek, hueco entre pistas, cola rellenándose) salía del primer plano al instante, y desde segundo plano Android 12+ **no deja volver a entrar**. | En segundo plano, salir del primer plano espera 5 s (`BACKGROUND_STOP_FOREGROUND_DELAY_MS`) y vuelve a comprobar. El botón "detener" de la notificación (`userStopRequestedAt`) o una parada con la app visible siguen siendo instantáneos. |
| **Carrera**: el "salir del primer plano" que programa `reset()` al empezar una canción podía ejecutarse *después* de que la canción nueva ya hubiera entrado en primer plano (las banderas no se actualizan en estados LOADING/BUFFERING), y lo sacaba con la música sonando. Intermitente, más frecuente en teléfonos lentos. | Contador `notificationGeneration`: una salida programada se descarta si después se publicó otra notificación; y nunca se sale mientras `playWhenReady` y el estado es de reproducción. |
| Nada re-aseguraba el primer plano al pasar a PLAYING si la notificación no se republicaba. | Al entrar en `PLAYING` se llama `startForegroundIfNecessary()`. |
| ExoPlayer sin wake lock (`WakeMode.NONE`). | `WakeMode.LOCAL`: la CPU no se duerme con la pantalla apagada / Doze. |
| `QueuedAudioPlayer.move()` de kotlinaudio reinserta su lista espejo en `toIndex - 1` al mover **hacia arriba**: `getQueue()` quedaba desalineada con lo que suena (subía 2 puestos, duplicados). | `MusicService.move` corrige la lista espejo (campo privado `queue`, por reflexión; `proguard-rules.pro` conserva `com.doublesymmetry.kotlinaudio.**`). |

El parche también contiene lo anterior (EQ por reflexión, `reactHost`, MusicModule
con promesas). Para editarlo ver `RELEASING.md` › "Higiene del build".

## 2. Si Android mata el proceso igual

- `features/player/store/queuePersistence.ts` guarda la cola (ids, orden original,
  contexto, aleatorio) en AsyncStorage en cada cambio.
- `PositionPersistenceUseCase.savePositionNow` guarda además `sessionPosition` y
  `wasPlaying`. Si el proceso murió **sonando** (`wasPlaying`), `restoreLastSession`
  retoma en ese segundo aunque la canción no tenga "recordar posición"; si la
  usuaria pausó o detuvo, se aplica la política de siempre.
- `restoreLastSession` reconstruye la cola completa alrededor de la canción; si no
  hay cola guardada, carga la canción sola (y el fin de cola la continúa).
- Todas las escrituras están en `try/catch`: con el disco lleno (ENOSPC) no se
  guarda, pero la música no se interrumpe.

## 3. Cola sin fin y cola editable

- `queueLoop.ts` añade la siguiente vuelta *antes* de que termine la última pista.
- El respaldo `PlaybackQueueEnded` (playbackService) **añade + salta**, no hace
  `reset()`: `reset()` deja el reproductor en IDLE, que es justo una parada que
  saca del primer plano.
- `QueueScreen` ejecuta cada acción de una en una y después **relee la cola real**
  del reproductor. Los movimientos se replican en el store (`moveSongInQueue`),
  del que salen la siguiente vuelta y la cola guardada. Con aleatorio activo solo
  cambia la vuelta actual (la siguiente se vuelve a mezclar).
- Toda pantalla que reproduce una lista debe llamar a `usePlayerStore.setQueue`
  además de `TrackPlayerService.setQueue` (Buscar no lo hacía y la siguiente vuelta
  repetía la lista anterior).

## 4. Batería "Restringido"

Con el uso de batería de la app en **Restringido** (`RUN_ANY_IN_BACKGROUND=ignore`,
lo pone la usuaria o un gestor del fabricante) Android detiene el servicio en
primer plano **a propósito** al salir de la app: ningún código lo evita.
`infrastructure/audio/backgroundRestriction.ts` lo detecta
(`ActivityManager.isBackgroundRestricted`, vía `AudioControl`) al abrir/volver a la
app y muestra una vez por sesión un aviso con botón a los ajustes de la app.

## 5. Interrupciones

`setupPlayer({ autoHandleInterruptions })`: con `true` ExoPlayer gestiona el foco de
audio (llamadas, alarmas) y `playWhenReady` sigue en `true` durante la pausa
transitoria, así que la notificación sigue "en curso" y no se sale del primer
plano. Con "seguir sonando en reuniones" se pasa `false` y no se cede el foco.
`handleAudioBecomingNoisy` pausa al desconectar auriculares.

## 6. Diagnóstico

```bash
adb logcat -s MeloVault                       # motivo de la última muerte del proceso (MainApplication)
adb shell dumpsys activity services com.melovault | grep isForeground   # debe ser true sonando
adb shell dumpsys activity processes com.melovault | grep -m1 'cur='    # 50/200 bien, 700 = en riesgo
adb shell dumpsys media_session | grep -A12 'KotlinAudioPlayer com'     # estado y canción
```

## 7. Cómo probar como un teléfono de gama baja

Probado en el Honor de desarrollo, el 2026-09-26 (vc18):

1. **Quitar la exención de batería** que el Honor le da a MeloVault: la exención
   permite volver a primer plano desde segundo plano y **oculta** estos bugs.
   `adb shell dumpsys deviceidle whitelist -com.melovault` y
   `adb shell am set-standby-bucket com.melovault restricted`.
2. Reproducir desde la app, ir a inicio y, en segundo plano:
   `am start-foreground-service -n com.melovault/com.doublesymmetry.trackplayer.service.MusicService`
   (= botón Bluetooth), `am kill com.melovault` (con primer plano **no** debe
   morir), `am send-trim-memory com.melovault RUNNING_CRITICAL`, scroll rápido en la
   galería midiendo underruns (`dumpsys media.audio_flinger`), pantalla apagada +
   `dumpsys deviceidle force-idle`.
3. Tocar canciones varias veces y con arranque en frío (la carrera es intermitente).
4. Disco lleno: `adb shell fallocate -l <libre>K /data/local/tmp/relleno` y
   **borrarlo siempre** después (`rm /data/local/tmp/relleno*`).
5. **Restaurar**: `dumpsys deviceidle whitelist +com.melovault`,
   `am set-standby-bucket com.melovault active`,
   `cmd appops set com.melovault RUN_ANY_IN_BACKGROUND allow`. Ojo: **no** uses
   `default`: Android lo trata como "Restringido".
