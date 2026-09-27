package com.melovault

import android.app.ActivityManager
import android.app.Application
import android.content.res.Configuration
import android.os.Build
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Native MediaStore-backed audio tag reader (artist/album/…).
          add(AudioMetadataPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    logLastExitReason()
  }

  // Why did the previous process die? (low memory, crash, user swipe…). Lets a
  // "the music stopped by itself" report be diagnosed later with
  // `adb logcat -s MeloVault` without having reproduced it live.
  private fun logLastExitReason() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
    try {
      val am = getSystemService(ActivityManager::class.java) ?: return
      am.getHistoricalProcessExitReasons(packageName, 0, 3).forEach {
        Log.i("MeloVault", "previous exit: reason=${it.reason} importance=${it.importance} " +
          "pss=${it.pss}KB at=${it.timestamp} ${it.description ?: ""}")
      }
    } catch (e: Exception) {
      Log.w("MeloVault", "exit reasons unavailable", e)
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
