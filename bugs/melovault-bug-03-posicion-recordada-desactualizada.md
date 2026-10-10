# MeloVault — Bug #3 (pendiente): al tocar una canción "recordada" retoma en un punto viejo

> Hallado el 2026-10-08 mientras se verificaba el arreglo del Bug #2 (vc19, commit `10cb724`) en el Honor Magic 7 Lite.
> **No lo reportó la usuaria.** Ya pasaba en vc18. Se dejó sin tocar para no arriesgar la release del Bug #2.
> Prioridad: baja. Solo afecta a canciones con "Recordar posición" activado (o heredado de una playlist).

---

## 1. Síntoma

1. Busca una canción que tenga "Recordar posición" activado, por ejemplo una que iba en 1:00, y tócala en **Buscar**. Retoma en 1:00 (correcto).
2. Escúchala hasta 2:30 y cambia a otra canción. La posición 2:30 **sí se guarda** en la DB.
3. Sin escribir nada nuevo en el buscador, vuelve a tocar la misma canción en los mismos resultados.
4. **Retoma en 1:00**, no en 2:30.

Si escribes de nuevo en el buscador (los resultados se recargan), retoma bien en 2:30.

## 2. Causa

`SearchScreen.playSong` (`src/features/search/presentation/screens/SearchScreen.tsx`, ~línea 56) le pasa a `resolveResumePosition(song)` el objeto `Song` **de los resultados en memoria** (`results`, un `useState`). Esos resultados se cargaron con `getAll()` en el momento de buscar, y `song.lastPosition` es una **copia** de ese instante. No se entera de los guardados posteriores (`SongRepository.updateLastPosition`).

`resolveResumePosition` (`src/features/player/domain/usecases/resumePosition.ts`) lee `song.lastPosition` directamente y no consulta la DB.

**Probablemente también afecta a la Biblioteca.** `LibraryPlaceholder.playSong` (~línea 217) usa el mismo patrón con la lista cargada por `repoRef.current.getAll(...)`. Hay que confirmarlo en el dispositivo; puede que no se note si la lista se recarga al volver a la pestaña. Faltan por revisar Favoritos, Recién agregadas y Detalle de playlist, que podrían tener el mismo patrón.

## 3. Lo que NO es

- No es un problema del guardado: la DB tiene el valor correcto, porque recargar la búsqueda lo arregla.
- No tiene relación con el arreglo `load()` del Bug #2. Ya pasaba igual en vc18.

## 4. Solución propuesta (un solo punto)

Que `resolveResumePosition` lea la posición **fresca de la DB** en lugar de confiar en el objeto que recibe:

```ts
// resumePosition.ts
export async function resolveResumePosition(song: Song): Promise<number> {
  if (!(await shouldRememberPosition(song))) return 0;
  const fresh = await new SongRepository().getById(song.id); // ← DB, no la copia en memoria
  const pos = fresh?.lastPosition ?? song.lastPosition ?? 0;
  const duration = fresh?.duration ?? song.duration;
  if (isAtEnd(pos, duration)) return 0;
  return pos;
}
```

- Arregla **todas** las pantallas a la vez (todas pasan por `resolveResumePosition`) sin tocar cada screen.
- Costo: una lectura por id al tocar. Es despreciable y ya se hace algo parecido en el handler de `PlaybackActiveTrackChanged`.
- `shouldRememberPosition(song)` ya está bien: solo usa el `id` (store de opt-in en memoria + herencia de playlist desde la DB). No lee nada viejo del objeto.

## 5. Cómo verificarlo en el dispositivo

1. Activa "Recordar posición" en una canción.
2. Desde **Buscar**: tócala, haz seek a ~1:00, cambia de canción. Vuelve a tocarla **sin rebuscar**: debe retomar en ~1:00.
3. Haz lo mismo desde Biblioteca, Favoritos, Recién agregadas y Detalle de playlist.
4. Regresiones a revisar:
   - Una canción **sin** opt-in empieza en 0:00.
   - Una canción dejada al final empieza en 0:00 (`isAtEnd`).
   - No se escucha un instante en 0:00 antes del seek (el pause previo de `loadTracks` en `TrackPlayerService` sigue funcionando).
   - La sesión se restaura bien en frío.

Para leer la posición real en las pruebas: `adb shell dumpsys media_session` (campos `position` y `updated`) junto con `/proc/uptime`, como se hizo en el Bug #2.

---

## Anexo: otra rareza vista (no es bug de la app)

`adb shell input keyevent KEYCODE_MEDIA_STOP` restaura la cola en el **índice 0** en lugar de en la canción que sonaba. El **botón ■ real de la notificación funciona bien** (restaura la canción y el segundo correctos). También pasaba en vc18. Parece que el keyevent entra por otra ruta (media button receiver) que no pasa por `Event.RemoteStop` de `playbackService.ts`. Solo hay que investigarlo si alguien lo reporta con auriculares o controles Bluetooth que envíen STOP.
