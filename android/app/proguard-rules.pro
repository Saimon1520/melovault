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

# react-native-fast-image
-keep class com.dylanvann.fastimage.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
