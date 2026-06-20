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

```bash
# 1) sube versionCode/versionName en android/app/build.gradle
# 2) compila el APK firmado
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=$HOME/Android/Sdk
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# 3) publica la release en GitHub
gh release create v1.0.1 \
  "android/app/build/outputs/apk/release/app-release.apk#melovault-v1.0.1.apk" \
  --title "MeloVault v1.0.1" --target master --notes "Cambios…"
```

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
