# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }

# react-native-worklets (JSI HostObject — R8 strips this without keep rule)
-keep class com.swmansion.worklets.** { *; }

# React Native TurboModules / Fabric (required by reanimated + worklets)
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }

# WatermelonDB
-keep class com.nozbe.watermelondb.** { *; }

# react-native-track-player
-keep class com.doublesymmetry.trackplayer.** { *; }

# kotlin-audio (bundled inside track-player, SEPARATE package). The EQ session
# hook reflects BaseAudioPlayer.getExoPlayer() — R8 renamed that method
# (observed: "EQ session hook failed: i1.c.getExoPlayer"), so keep it intact.
-keep class com.doublesymmetry.kotlinaudio.** { *; }

# MeloVault native modules. AudioEffects (the app-wide Equalizer) is reached by
# REFLECTION from the patched track-player MusicService — Class.forName(
# "com.melovault.AudioEffects") + getMethod("attachSession") + getField(
# "INSTANCE"). R8 must not rename/strip these or the equalizer silently never
# attaches to the audio session in release builds (EQ has no audible effect).
-keep class com.melovault.** { *; }

# react-native-fast-image
-keep class com.dylanvann.fastimage.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
