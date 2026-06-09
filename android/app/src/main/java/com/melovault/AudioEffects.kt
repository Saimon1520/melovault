package com.melovault

import android.media.audiofx.Equalizer

/**
 * Holds the app-wide 5-band [Equalizer] bound to the ExoPlayer audio session
 * used by react-native-track-player. The session id is pushed in from the
 * patched RNTP `MusicService` (see [attachSession]); the JS `Equalizer` native
 * module reads/writes band gains here.
 *
 * Band gains are kept in memory so they can be re-applied whenever the audio
 * session changes (e.g. after the player is recreated).
 */
object AudioEffects {
  private var equalizer: Equalizer? = null
  private var sessionId: Int = 0
  private var enabled: Boolean = false
  // Gains in millibels, indexed per band. Null until the EQ has been queried.
  private var gains: ShortArray? = null

  @Synchronized
  fun attachSession(newSessionId: Int) {
    if (newSessionId == 0 || newSessionId == sessionId && equalizer != null) {
      sessionId = newSessionId
      return
    }
    sessionId = newSessionId
    rebuild()
  }

  private fun rebuild() {
    try {
      equalizer?.release()
    } catch (_: Exception) {}
    equalizer = null
    if (sessionId == 0) return
    try {
      val eq = Equalizer(1000 /* high priority */, sessionId)
      eq.enabled = enabled
      // Re-apply any stored gains, clamped to the device's supported range.
      gains?.let { stored ->
        val range = eq.bandLevelRange
        val min = range[0]
        val max = range[1]
        for (i in 0 until minOf(stored.size, eq.numberOfBands.toInt())) {
          eq.setBandLevel(i.toShort(), stored[i].coerceIn(min, max))
        }
      }
      equalizer = eq
    } catch (_: Exception) {
      equalizer = null
    }
  }

  /** [centerFreqs] in millihertz, [min]/[max] band range in millibels. */
  @Synchronized
  fun describe(): EqInfo? {
    val eq = equalizer ?: return null
    return try {
      val n = eq.numberOfBands.toInt()
      val range = eq.bandLevelRange
      val freqs = IntArray(n) { eq.getCenterFreq(it.toShort()) }
      val current = IntArray(n) { eq.getBandLevel(it.toShort()).toInt() }
      EqInfo(n, range[0].toInt(), range[1].toInt(), freqs, current, eq.enabled)
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  fun setEnabled(value: Boolean) {
    enabled = value
    try {
      equalizer?.enabled = value
    } catch (_: Exception) {}
  }

  @Synchronized
  fun setBandLevel(band: Int, millibels: Int) {
    val eq = equalizer
    val stored = gains ?: ShortArray(if (eq != null) eq.numberOfBands.toInt() else (band + 1))
    if (band < stored.size) stored[band] = millibels.toShort()
    gains = stored
    try {
      if (eq != null) {
        val range = eq.bandLevelRange
        eq.setBandLevel(band.toShort(), millibels.toShort().coerceIn(range[0], range[1]))
      }
    } catch (_: Exception) {}
  }

  /** Applies a full set of band gains (millibels) at once. */
  @Synchronized
  fun setGains(values: IntArray) {
    gains = ShortArray(values.size) { values[it].toShort() }
    val eq = equalizer ?: return
    try {
      val range = eq.bandLevelRange
      for (i in 0 until minOf(values.size, eq.numberOfBands.toInt())) {
        eq.setBandLevel(i.toShort(), values[i].toShort().coerceIn(range[0], range[1]))
      }
    } catch (_: Exception) {}
  }

  data class EqInfo(
    val bandCount: Int,
    val minLevel: Int,
    val maxLevel: Int,
    val centerFreqs: IntArray,
    val currentLevels: IntArray,
    val enabled: Boolean,
  )
}
