package com.melovault

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * JS bridge for the native 5-band [AudioEffects] equalizer and for listing the
 * available audio output devices (speaker / wired / Bluetooth).
 */
class AudioControlModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudioControl"

  // ── Clipboard ──────────────────────────────────────────────────────────

  @ReactMethod
  fun copyToClipboard(text: String) {
    try {
      val cm = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      cm.setPrimaryClip(ClipData.newPlainText("MeloVault", text))
    } catch (_: Exception) {}
  }

  // ── Equalizer ──────────────────────────────────────────────────────────

  @ReactMethod
  fun getEqualizer(promise: Promise) {
    val info = AudioEffects.describe()
    val map: WritableMap = Arguments.createMap()
    if (info == null) {
      map.putBoolean("available", false)
      promise.resolve(map)
      return
    }
    map.putBoolean("available", true)
    map.putBoolean("enabled", info.enabled)
    map.putInt("bandCount", info.bandCount)
    map.putInt("minLevel", info.minLevel)
    map.putInt("maxLevel", info.maxLevel)
    val freqs: WritableArray = Arguments.createArray()
    info.centerFreqs.forEach { freqs.pushInt(it) }
    map.putArray("centerFreqs", freqs)
    val levels: WritableArray = Arguments.createArray()
    info.currentLevels.forEach { levels.pushInt(it) }
    map.putArray("currentLevels", levels)
    promise.resolve(map)
  }

  @ReactMethod
  fun setEqEnabled(enabled: Boolean) {
    AudioEffects.setEnabled(enabled)
  }

  @ReactMethod
  fun setBandLevel(band: Int, millibels: Int) {
    AudioEffects.setBandLevel(band, millibels)
  }

  @ReactMethod
  fun setGains(values: ReadableArray) {
    val arr = IntArray(values.size()) { values.getInt(it) }
    AudioEffects.setGains(arr)
  }

  // ── Output devices ─────────────────────────────────────────────────────

  @ReactMethod
  fun getOutputDevices(promise: Promise) {
    try {
      val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      val result: WritableArray = Arguments.createArray()
      val seen = HashSet<String>()
      for (d in devices) {
        val kind = deviceKind(d.type) ?: continue
        val name = d.productName?.toString()?.takeIf { it.isNotBlank() } ?: kind.label
        val dedupeKey = "${kind.id}:$name"
        if (!seen.add(dedupeKey)) continue
        val map: WritableMap = Arguments.createMap()
        map.putInt("id", d.id)
        map.putString("name", name)
        map.putString("type", kind.id)
        map.putBoolean("bluetooth", kind.id == "bluetooth")
        result.pushMap(map)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("OUTPUT_DEVICES_ERROR", e.message, e)
    }
  }

  // ── Device media volume ────────────────────────────────────────────────

  @ReactMethod
  fun getVolume(promise: Promise) {
    try {
      val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
      promise.resolve(if (max > 0) cur.toDouble() / max else 0.0)
    } catch (e: Exception) {
      promise.reject("VOLUME_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setVolume(value: Double) {
    try {
      val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val target = Math.round(value.coerceIn(0.0, 1.0) * max).toInt()
      am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun openBluetoothSettings() {
    try {
      val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
    } catch (_: Exception) {}
  }

  private data class Kind(val id: String, val label: String)

  private fun deviceKind(type: Int): Kind? = when (type) {
    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO ->
      Kind("bluetooth", "Bluetooth")
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET ->
      Kind("wired", "Auriculares con cable")
    AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE ->
      Kind("usb", "USB")
    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER ->
      Kind("speaker", "Altavoz del teléfono")
    else -> null
  }
}
