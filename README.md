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

### Reproducción de Audio
- Soporte completo para **MP3, FLAC, AAC, OGG, WAV, M4A, OPUS, WMA**
- Controles completos: Play / Pause / Stop / Anterior / Siguiente
- **Retroceder y avanzar** X segundos (configurable: 5, 10, 15, 30s)
- Slider de progreso con vista previa de seek
- Control de **velocidad de reproducción** (0.5x — 2.0x)
- **Gapless playback** (sin silencio entre canciones)
- **Crossfade** configurable entre canciones
- **Fade in / Fade out**
- **Sleep timer** (apagado automático tras N minutos)

### Organización
- **Biblioteca** completa: Canciones, Álbumes, Artistas, Géneros
- **Gestión de playlists** con arrastrar y soltar
- **Queue (cola)** de reproducción dinámica
- Modo **Shuffle** (aleatorio) y **Repeat** (repetir: uno / todos / ninguno)
- Búsqueda rápida en toda la biblioteca
- Ordenamiento por: título, artista, álbum, duración, fecha, reproducciones

### Persistencia Inteligente
- **Memoria de posición por canción**: MeloVault recuerda exactamente en qué segundo te quedaste en cada canción, sin importar cuánto tiempo pase entre sesiones.
- **Persistencia selectiva por playlist**: Cada playlist puede configurarse para *recordar* o *no recordar* la posición y canción activa. Ideal para distinguir entre playlists de fondo y audiolibros/podcasts.

### Letras
- Visualización de **letras sincronizadas** (formato LRC) con scroll automático
- Búsqueda automática de letras via **LRCLib** (gratuito, sin API key)
- Editor de letras **manual** para agregar o corregir
- Soporte para letras incrustadas en el archivo de audio (ID3 SYLT/USLT)

### Metadatos Dinámicos
- Extracción automática de todos los tags de audio al importar:
  - Título, Artista, Álbum, Año de publicación
  - Disquera (Label), Compositor, Colaboraciones
  - Número de pista, Género, Fuente de descarga
  - Tasa de bits, Frecuencia de muestreo, Tamaño
- Panel de información **colapsable** — oculto por defecto para no sobrecargar la UI
- Soporte para **campos dinámicos extra**: si una canción tiene metadatos no estándar, se detectan y muestran automáticamente
- Solo se muestra la información disponible (sin campos vacíos)

### Portadas de Álbum
- Extracción automática de **artwork incrustado** en el archivo de audio
- Asignación **manual** de imágenes de portada
- Caché eficiente de imágenes para rendimiento óptimo

### Gestión de Archivos
- Eliminar canciones del dispositivo con **validación de seguridad** (confirmación obligatoria)
- **Ocultar** canciones de la app sin eliminarlas del dispositivo
- Soporte para múltiples ubicaciones de almacenamiento

### Bluetooth
- Transmisión de audio a **dispositivos Bluetooth** externos (speakers, auriculares, earbuds)
- Selector de dispositivo Bluetooth integrado
- Compatible con el protocolo **A2DP** (audio de alta calidad por Bluetooth)

### Equalizer
- **Equalizer de 5 bandas**: Graves, Bajo-Medio, Medio, Alto-Medio, Agudos
- Presets integrados: Normal, Rock, Pop, Jazz, Clásica, Bass Boost, Vocal
- Creación y guardado de **presets personalizados**

---

## 📱 Compatibilidad

| Plataforma | Estado |
|------------|--------|
| Android (todas las marcas) | ✅ Soportado |
| Android 13 / 14 | ✅ Background playback con foreground service |
| Samsung | ✅ |
| Motorola | ✅ |
| Huawei (sin GMS / HMS) | ✅ Compatible — no depende de Google Services |
| iOS | ✅ Soportado |
| Tablets | ✅ UI adaptable a pantallas grandes |

**Resoluciones soportadas**: desde 4" hasta 7"+, cualquier relación de aspecto.

---

## 🏗️ Arquitectura

### Patrón: Feature-Sliced Design + Clean Architecture

```
melovault/
├── src/
│   ├── app/                    # Bootstrap, providers, navegación
│   │   └── navigation/         # RootNavigator, BottomTabNavigator
│   ├── features/               # Módulos independientes
│   │   ├── player/             # Motor de reproducción
│   │   ├── library/            # Biblioteca de canciones
│   │   ├── playlists/          # Gestión de playlists
│   │   ├── lyrics/             # Letras sincronizadas
│   │   ├── bluetooth/          # Gestión de Bluetooth
│   │   └── settings/           # Configuración
│   ├── infrastructure/         # Adaptadores externos
│   │   ├── database/           # WatermelonDB (SQLite)
│   │   ├── audio/              # react-native-track-player
│   │   ├── filesystem/         # react-native-fs
│   │   ├── metadata/           # Extractor ID3
│   │   ├── bluetooth/          # Servicio BT
│   │   └── lyrics/             # LRCLib API
│   ├── shared/                 # Utilidades transversales
│   └── design-system/          # Tokens, tema, componentes base
```

Cada feature sigue el patrón:
- `domain/entities/` — tipos de negocio puros
- `domain/usecases/` — lógica de negocio (sin dependencias de UI)
- `data/repositories/` — acceso a datos via infraestructura
- `presentation/` — screens, components, hooks de UI
- `store/` — estado global con Zustand

### Base de Datos

WatermelonDB (SQLite) con las siguientes tablas:

| Tabla | Propósito |
|-------|-----------|
| `songs` | Canciones con todos sus metadatos y posición guardada |
| `playlists` | Playlists con configuración de persistencia selectiva |
| `playlist_songs` | Relación playlist ↔ canción con orden |
| `player_state` | Estado del reproductor (persiste entre sesiones) |
| `equalizer_presets` | Presets de ecualizador |
| `settings` | Configuración general de la app |

---

## 🛠️ Stack Técnico

| Categoría | Tecnología | Razón |
|-----------|-----------|-------|
| Framework | React Native 0.85 + Expo Bare | Acceso nativo completo |
| Lenguaje | TypeScript 5.x strict | Seguridad de tipos |
| Audio | react-native-track-player v4 | Background playback, notificaciones |
| Base de datos | WatermelonDB | 10k+ canciones, lazy loading, reactivo |
| Estado | Zustand v5 | Mínimo boilerplate, hooks nativos |
| Navegación | React Navigation v7 | Estándar de la industria |
| UI/Estilos | NativeWind v4 (Tailwind) | Desarrollo rápido y consistente |
| Animaciones | react-native-reanimated v3 | 60fps en UI thread |
| Imágenes | react-native-fast-image | Caché Glide/SDWebImage |
| Archivos | react-native-fs | Acceso completo al sistema de archivos |
| Media | expo-media-library | Escaneo de medios iOS/Android |
| Letras | LRCLib API | Gratuito, 100k+ canciones, sin API key |
| Build | EAS Build (Expo) | CI/CD Android + iOS en la nube |

---

## 🚀 Desarrollo

### Requisitos

- Node.js 18+
- pnpm 8+
- Android Studio (para builds Android) o Xcode (para builds iOS)
- Java 17+ (para Android)

### Instalación

```bash
git clone https://github.com/Saimon1520/melovault.git
cd melovault
pnpm install
```

### Ejecutar en Android

```bash
# Primera vez — genera el APK de desarrollo
pnpm run android

# Subsiguientes veces — solo necesitas Metro
pnpm start
```

### Ejecutar en iOS (requiere macOS + Xcode)

```bash
pnpm run ios
```

### Variables de entorno

```bash
cp .env.example .env
```

No se requieren API keys para funcionalidad completa (LRCLib es gratuito y sin autenticación).

---

## 📋 Fases de Desarrollo

### ✅ Fase 0 — Proyecto base (Completada)
- [x] Estructura del proyecto
- [x] Stack técnico configurado
- [x] Design System (tokens, tema dark)
- [x] Base de datos schema (WatermelonDB)
- [x] Navegación base
- [x] Arquitectura Feature-Sliced + Clean Architecture

### 🔄 Fase 1 — Fundación (Semanas 1-3)
- [ ] Integración de react-native-track-player
- [ ] Escaneo de biblioteca de música local
- [ ] Extracción de metadatos ID3
- [ ] Pantalla principal completa (Now Playing)
- [ ] Mini player persistente

### 📦 Fase 2 — Features Core (Semanas 4-7)
- [ ] Controles completos (seek, previous, next, speed, shuffle, repeat)
- [ ] Persistencia de posición por canción
- [ ] Persistencia selectiva por playlist
- [ ] Gestión completa de playlists (CRUD, reorder)
- [ ] Letras (manual + LRCLib fetch)
- [ ] Panel de metadatos colapsable
- [ ] Delete/hide songs con validación

### 🎚️ Fase 3 — Features Avanzados (Semanas 8-10)
- [ ] Equalizer de 5 bandas
- [ ] Crossfade + fade in/out
- [ ] Sleep timer
- [ ] Selección de dispositivo Bluetooth
- [ ] Testing en dispositivos Huawei
- [ ] Soporte para tablets

### ✨ Fase 4 — Pulido y Deploy (Semanas 11-12)
- [ ] Animaciones y micro-interacciones
- [ ] Onboarding para nuevos usuarios
- [ ] Profiling de performance con 10k+ canciones
- [ ] EAS Build — APK/AAB para Android
- [ ] EAS Build — IPA para iOS
- [ ] Testing en múltiples dispositivos

### 🖥️ Fase 5 — Desktop (Futuro)
- [ ] React Native for Windows / macOS
- [ ] O: migración de lógica de negocio a Tauri
- [ ] Versión ejecutable (.exe / AppImage Linux)

---

## 🎨 Design System

MeloVault usa un sistema de diseño **dark-first** con extracción dinámica de color del artwork:

- **Fondo**: `#0E0E16` — negro profundo que hace el artwork protagonista
- **Acento**: `#7C5CFC` — violeta vibrante, overrideable por color dominante del álbum
- **Tipografía**: SF Pro Display (iOS) / Roboto (Android) — fuentes del sistema para rendimiento
- **Grid**: Base de 4px — todo el espaciado es múltiplo de 4
- **Contraste**: Texto primario 16.4:1 ratio (supera WCAG AAA)

---

## 🔒 Privacidad

- **Sin telemetría** — MeloVault no envía ningún dato a servidores externos
- **Sin cuenta requerida** — todo funciona offline y localmente
- **Sin acceso a internet necesario** para reproducción (sólo para búsqueda de letras si se activa)
- Todos los datos se almacenan en el dispositivo del usuario

---

## 📄 Licencia

MIT License — ver [LICENSE](LICENSE)

---

## 👤 Autor

**Saimon Vargas** — [saimongerardo1529@gmail.com](mailto:saimongerardo1529@gmail.com)

---

> MeloVault — Tu música. Tu control.
