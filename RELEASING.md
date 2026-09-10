# Publicar una nueva versión (con actualización in-place)

Para que Android **actualice** MeloVault sobre la versión instalada (en vez de
pedir instalar de cero), cada release debe cumplir 2 cosas:

1. **Misma clave de firma.** Todas las releases se firman con
   `android/app/melovault-release.keystore` (alias `melovault`). Ya está
   configurado en `android/app/build.gradle` (`signingConfigs.release`), así que
   `assembleRelease` lo usa automáticamente. **No borres ni regeneres ese
   keystore** o se romperán las actualizaciones (habría que desinstalar otra vez).

2. **`versionCode` mayor.** Sube `versionCode` (y normalmente `versionName`) en
   `android/app/build.gradle` › `defaultConfig` en cada release:

   ```
   versionCode 2          // +1 respecto a la anterior
   versionName "1.0.1"    // texto visible
   ```

## Pasos

Hay **una sola release**, la etiqueta `v1.0.0`, que se reutiliza en cada
actualización: se mueve la etiqueta al nuevo commit y se reemplaza el APK. No
crees etiquetas nuevas.

```bash
# 1) sube versionCode en android/app/build.gradle (obligatorio para actualizar
#    in-place; versionName puede quedarse igual)
# 2) compila el APK firmado
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=$HOME/Android/Sdk
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# 3) sube el código y mueve la etiqueta al commit publicado
git push origin master
git tag -f v1.0.0 && git push origin -f v1.0.0

# 4) reemplaza el APK de la release (--clobber no imprime nada si va bien)
gh release upload v1.0.0 \
  android/app/build/outputs/apk/release/app-release.apk --clobber

# 5) actualiza las notas (ver la regla de abajo antes de escribirlas)
gh release edit v1.0.0 --target master --notes-file notas.md
```

El nombre del asset se queda en `app-release.apk`: el sufijo `#nombre.apk` para
renombrarlo lo ignora la versión de `gh` instalada.

### Las notas de la release son ACUMULATIVAS

Como solo existe una release, su texto es el **escaparate de la app**: es lo
único que lee alguien que llega a decidir si la descarga. Por eso las notas
describen **todo lo que hace MeloVault**, y cada actualización **añade** sus
funciones nuevas a esa descripción.

**Nunca las reemplaces por un changelog del tipo "novedades de esta versión".**
A quien no conoce la app, un changelog le habla de cambios respecto a una
versión que nunca tuvo, y no le dice qué obtiene si la instala.

Antes de publicar: lee las notas actuales (`gh release view v1.0.0`), integra lo
nuevo en la sección de funciones que corresponda (Biblioteca · Reproducción ·
Letras · Playlists y favoritos · Apariencia · Privacidad), conserva las
instrucciones de descarga (primera instalación vs. actualización) y el pie con
la identidad del build (versionCode, commit, sha256 del APK).

### Verificación posterior

```bash
# el APK publicado es de verdad el que compilaste (descarga anónima)
curl -sL -o /tmp/pub.apk \
  https://github.com/Saimon1520/melovault/releases/download/v1.0.0/app-release.apk
sha256sum /tmp/pub.apk android/app/build/outputs/apk/release/app-release.apk

# y el que tiene el teléfono es el mismo (no hace falta root)
adb shell sha256sum $(adb shell pm path com.melovault | sed 's/package://')
```

> **Publicar en GitHub NO actualiza tu teléfono.** Comprueba siempre la versión
> que tiene el dispositivo antes de dar por bueno un arreglo:
> `adb shell dumpsys package com.melovault | grep versionCode`

En el teléfono, al abrir el nuevo APK Android dirá **"Actualizar"** y reemplaza
la versión anterior conservando los datos (playlists, favoritos, letras, etc.).

> **Transición única (solo la primera vez):** la v1.0.0 firmada con la clave de
> depuración debe desinstalarse una vez antes de instalar la v1.0.0 firmada con
> esta clave. A partir de ahí, todas las versiones futuras se actualizan solas.

## Revisión de actualización — que NO se pierdan playlists/datos

Los datos del usuario (playlists, orden, favoritos, ocultos, ajustes) viven en
`databases/watermelon.db` (WatermelonDB) y `databases/RKStorage` (AsyncStorage).
Una actualización **in-place real conserva todo** porque Android no toca
`/data`. Los datos solo se borran si Android tiene que **desinstalar** primero.
Antes de publicar cada release, verifica estas 3 causas de pérdida de datos:

1. **Misma firma.** Si el APK nuevo está firmado con otra clave (p. ej. un build
   de `pnpm android` firmado con `debug.keystore`, o un keystore regenerado),
   Android NO actualiza: obliga a desinstalar → se borra todo. Confirma siempre
   que el APK de distribución sea `assembleRelease` (clave `melovault`). Verifica:

   ```bash
   # huella del APK que vas a publicar (debe coincidir release-a-release)
   apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk | grep SHA-256
   ```

2. **Schema de WatermelonDB.** NO subas `version` en `schema.ts` sin añadir una
   migración en `migrations/index.ts`; un bump sin migración **borra la base de
   datos** en la actualización. Para flags nuevos por canción usa AsyncStorage
   (ver `archiveStore`/`positionMemoryStore`). Ver la advertencia en `schema.ts`.

3. **`versionCode` mayor.** Sin esto Android rechaza la actualización.

### Red de seguridad: Auto Backup

`AndroidManifest` tiene `allowBackup="true"` con reglas en
`res/xml/backup_rules.xml` y `res/xml/data_extraction_rules.xml`. Esto respalda
WatermelonDB + AsyncStorage en Google, de modo que aunque haya que **reinstalar**
(o cambiar de teléfono), las playlists y la organización se restauran solas si el
usuario tiene la copia de seguridad de Google activada y la misma cuenta.

### Probar la actualización antes de publicar

```bash
# instala la versión vieja, crea una playlist, luego instala la nueva ENCIMA
adb install -r android/app/build/outputs/apk/release/app-release.apk
# abre la app y confirma que la playlist sigue ahí (-r = update in-place)
```
