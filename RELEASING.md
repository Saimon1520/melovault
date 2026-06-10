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
