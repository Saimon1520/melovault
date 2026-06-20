# MeloVault 🎵

> Reproductor de música local. Gratuito. Sin anuncios. Sin límites.

MeloVault es un reproductor de música para dispositivos móviles diseñado con un propósito claro: **tú controlas tu música**. Sin suscripciones, sin anuncios, sin rastreo. Tu biblioteca, tus playlists, tus letras — todo almacenado localmente en tu dispositivo.

---

## 📥 Descarga (Android)

**[⬇️ Descargar la última versión (APK)](https://github.com/Saimon1520/melovault/releases/latest)**

Enlace directo al APK:

```
https://github.com/Saimon1520/melovault/releases/download/v1.0.0/app-release.apk
```

| | |
|---|---|
| **Versión** | v1.0.0 (estable) |
| **Tamaño** | ~49 MB |
| **Requisitos** | Android 7.0+ (API 24), ARM (arm64-v8a / armeabi-v7a) |
| **Todas las versiones** | [Página de releases](https://github.com/Saimon1520/melovault/releases) |

### Cómo instalar

1. Descarga el **APK** desde el enlace de arriba.
2. Ábrelo en tu teléfono. La primera vez, Android pedirá permitir **«instalar apps de origen desconocido»** — actívalo para tu navegador/gestor de archivos (es normal para apps fuera de Play Store).
3. Toca **Instalar** y listo.

### Actualizaciones

Cuando salga una versión nueva, solo descarga e instala el nuevo APK **encima** de la app actual. Android dirá **«Actualizar»** y **conserva todos tus datos** — playlists, posiciones guardadas, favoritos y ajustes se mantienen intactos. No necesitas desinstalar.

> 💡 Para recibir avisos automáticos de nuevas versiones puedes usar [Obtainium](https://github.com/ImranR98/Obtainium) apuntando al repositorio de releases.

---

## ✨ Características

### 🎧 Reproducción de Audio
- Soporte completo para **MP3, FLAC, AAC, OGG, WAV, M4A, OPUS, WMA**
- Controles completos: Play / Pause / Stop / Anterior / Siguiente
- **Retroceder y avanzar** X segundos (configurable: 5, 10, 15, 30s)
- Slider de progreso con vista previa de seek
- Control de **velocidad de reproducción** (0.5x — 2.0x)
- **Crossfade / fade in / fade out** configurable entre canciones
- **Sleep timer** (apagado automático tras N minutos)
- Controles en la **notificación**, pantalla bloqueada y auriculares Bluetooth

### 🗂️ Organización
- **Biblioteca** completa: Canciones, Álbumes, Artistas, Géneros
- **Gestión de playlists** y **cola (queue)** dinámica
- Modo **Shuffle** (aleatorio) y **Repeat** (uno / todos / ninguno)
- Búsqueda rápida en toda la biblioteca
- Ordenamiento por: título, artista, álbum, duración, fecha, reproducciones
- **Ocultar** o **eliminar** canciones con confirmación de seguridad

### 🧠 Persistencia Inteligente
- **Memoria de posición por canción**: recuerda exactamente en qué segundo te quedaste en cada canción, sin importar cuánto tiempo pase entre sesiones.
- **Persistencia selectiva por playlist**: cada playlist puede *recordar* o *no recordar* la posición y canción activa. Ideal para distinguir música de fondo de audiolibros/podcasts.

### 📝 Letras
- **Letras sincronizadas** (formato LRC) con scroll automático
- Búsqueda automática de letras via **LRCLib** (gratuito, sin API key)
- Editor de letras **manual** para agregar o corregir
- Soporte para letras incrustadas en el archivo (ID3 SYLT/USLT)

### 🏷️ Metadatos y Portadas
- Extracción automática de tags al importar: título, artista, álbum, año, disquera, compositor, número de pista, género, tasa de bits, frecuencia de muestreo y más
- Panel de información **colapsable** — solo muestra lo disponible
- Extracción automática de **artwork incrustado** + asignación manual de portadas

### 🎚️ Audio Avanzado
- **Equalizer de 5 bandas** con presets (Rock, Pop, Jazz, Clásica, Bass Boost, Vocal…) y presets personalizados
- Transmisión a **dispositivos Bluetooth** (A2DP) con selector de salida integrado

---

## 📱 Compatibilidad

| Plataforma | Estado |
|------------|--------|
| Android 7.0+ (todas las marcas) | ✅ Soportado |
| Android 13 / 14 / 15+ | ✅ Background playback con foreground service |
| Samsung · Motorola · Xiaomi · Honor | ✅ |
| Huawei (sin GMS / HMS) | ✅ No depende de Google Services |
| Tablets | ✅ UI adaptable a pantallas grandes |
| iOS | ✅ Soportado (compilando desde el código) |

**Resoluciones soportadas**: desde 4" hasta 7"+, cualquier relación de aspecto.

---

## 🔒 Privacidad

- **Sin telemetría** — MeloVault no envía ningún dato a servidores externos
- **Sin cuenta requerida** — todo funciona offline y localmente
- **Sin internet necesario** para reproducción (solo para buscar letras, si lo activas)
- Todos los datos se almacenan **en tu dispositivo**

---

<br>

# 🛠️ Para desarrolladores

> Esta sección es para quien quiera compilar o contribuir. Si solo quieres usar la app, con la [descarga](#-descarga-android) es suficiente.

## Stack técnico

| Categoría | Tecnología |
|-----------|-----------|
| Framework | React Native 0.85 + Expo (Bare) |
| Lenguaje | TypeScript (strict) |
| Audio | react-native-track-player v4 |
| Base de datos | WatermelonDB (SQLite) |
| Estado | Zustand v5 |
| Navegación | React Navigation v7 |
| UI / Estilos | NativeWind v4 (Tailwind) |
| Animaciones | react-native-reanimated v4 |
| Imágenes | expo-image (caché nativo, WebP) |
| Listas | @shopify/flash-list |
| Letras | LRCLib API (gratuito, sin API key) |

## Arquitectura

Patrón **Feature-Sliced Design + Clean Architecture**:

```
src/
├── app/                # Bootstrap, providers, navegación
├── features/           # Módulos independientes
│   ├── player/         # Motor de reproducción
│   ├── library/        # Biblioteca de canciones
│   ├── playlists/      # Gestión de playlists
│   ├── lyrics/         # Letras sincronizadas
│   ├── bluetooth/      # Gestión de Bluetooth
│   └── settings/       # Configuración
├── infrastructure/     # Adaptadores externos (DB, audio, FS, metadatos, letras)
├── shared/             # Utilidades transversales
└── design-system/      # Tokens, tema, componentes base
```

Cada feature sigue: `domain/` (entidades + casos de uso), `data/` (repositorios), `presentation/` (screens, components, hooks) y `store/` (estado Zustand).

**Base de datos (WatermelonDB):**

| Tabla | Propósito |
|-------|-----------|
| `songs` | Canciones con metadatos y posición guardada |
| `playlists` | Playlists con persistencia selectiva |
| `playlist_songs` | Relación playlist ↔ canción con orden |
| `player_state` | Estado del reproductor entre sesiones |
| `equalizer_presets` | Presets de ecualizador |
| `settings` | Configuración general |

## Desarrollo

**Requisitos:** Node.js 18+, pnpm 8+, Java 17+ y Android Studio (o Xcode para iOS).

```bash
git clone https://github.com/Saimon1520/melovault.git
cd melovault
pnpm install

# Ejecutar en Android (primera vez compila el APK de desarrollo)
pnpm run android
# Después solo necesitas Metro:
pnpm start

# iOS (requiere macOS + Xcode)
pnpm run ios
```

No se requieren API keys: LRCLib es gratuito y sin autenticación. Para publicar una nueva versión firmada, ver [`RELEASING.md`](RELEASING.md).

## 🎨 Design System

Sistema **dark-first** con extracción dinámica de color del artwork:

- **Fondo**: `#0E0E16` — negro profundo que hace el artwork protagonista
- **Acento**: `#7C5CFC` — violeta vibrante, overrideable por el color dominante del álbum
- **Grid**: base de 4px — todo el espaciado es múltiplo de 4
- **Contraste**: texto primario 16.4:1 (supera WCAG AAA)

## 📋 Estado del proyecto

**Versión actual: `v1.0.0` — estable y publicada.** Todas las funciones de arriba están implementadas y probadas en dispositivo:

- ✅ Reproducción, biblioteca, metadatos y portadas
- ✅ Playlists, cola, shuffle / repeat, búsqueda
- ✅ Memoria de posición por canción + persistencia selectiva por playlist
- ✅ Letras sincronizadas (LRCLib) + editor manual
- ✅ Equalizer, crossfade / fade, sleep timer
- ✅ Bluetooth (A2DP) + selector de salida
- ✅ Soporte de tablets y orientación

**Roadmap (futuro):**
- [ ] Edición de metadatos/tags desde la app
- [ ] Versión de escritorio (Windows / Linux / macOS)

---

## 📄 Licencia

MIT License — ver [LICENSE](LICENSE)

## 👤 Autor

**Saimon Vargas** — [saimongerardo1529@gmail.com](mailto:saimongerardo1529@gmail.com)

---

> MeloVault — Tu música. Tu control.
