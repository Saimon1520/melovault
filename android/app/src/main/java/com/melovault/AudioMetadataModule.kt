package com.melovault

import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.os.Build
import android.provider.MediaStore
import android.util.Size
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream

/**
 * Reads audio tag metadata (artist, album, title, year, track, …) straight from
 * the Android MediaStore, which has already parsed every supported format
 * (MP3, M4A, FLAC, OGG, OPUS, …). expo-media-library does not expose these
 * fields for audio assets, so we query the provider directly here.
 */
class AudioMetadataModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudioMetadata"

  /**
   * Given an array of MediaStore IDs (the same ids expo-media-library returns as
   * `asset.id`), returns a map keyed by id -> { artist, album, title, year,
   * trackNumber, duration, albumArtist, composer, genre, bitRate }.
   */
  @ReactMethod
  fun getByIds(ids: ReadableArray, promise: Promise) {
    try {
      val result: WritableMap = Arguments.createMap()
      val resolver = reactApplicationContext.contentResolver

      val columns = mutableListOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.DATA,
        MediaStore.Audio.Media.SIZE,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.YEAR,
        MediaStore.Audio.Media.TRACK,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.COMPOSER,
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        columns.add(MediaStore.Audio.Media.ALBUM_ARTIST)
        columns.add(MediaStore.Audio.Media.GENRE)
        columns.add(MediaStore.Audio.Media.BITRATE)
      }

      // Build a single batched query: _id IN (?, ?, …)
      val idList = ArrayList<String>(ids.size())
      for (i in 0 until ids.size()) {
        ids.getString(i)?.let { idList.add(it) }
      }
      if (idList.isEmpty()) {
        promise.resolve(result)
        return
      }

      val placeholders = idList.joinToString(",") { "?" }
      val selection = "${MediaStore.Audio.Media._ID} IN ($placeholders)"

      resolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        columns.toTypedArray(),
        selection,
        idList.toTypedArray(),
        null,
      )?.use { cursor ->
        val idIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val dataIdx = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
        val sizeIdx = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE)
        val titleIdx = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE)
        val artistIdx = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST)
        val albumIdx = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM)
        val yearIdx = cursor.getColumnIndex(MediaStore.Audio.Media.YEAR)
        val trackIdx = cursor.getColumnIndex(MediaStore.Audio.Media.TRACK)
        val durIdx = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION)
        val composerIdx = cursor.getColumnIndex(MediaStore.Audio.Media.COMPOSER)
        val albumArtistIdx =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ARTIST) else -1
        val genreIdx =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            cursor.getColumnIndex(MediaStore.Audio.Media.GENRE) else -1
        val bitrateIdx =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            cursor.getColumnIndex(MediaStore.Audio.Media.BITRATE) else -1

        while (cursor.moveToNext()) {
          val id = cursor.getString(idIdx) ?: continue
          val map: WritableMap = Arguments.createMap()

          fun putStr(idx: Int, key: String) {
            if (idx >= 0 && !cursor.isNull(idx)) {
              val v = cursor.getString(idx)
              if (!v.isNullOrEmpty() && v != "<unknown>") map.putString(key, v)
            }
          }
          putStr(dataIdx, "filePath")
          putStr(titleIdx, "title")
          putStr(artistIdx, "artist")
          putStr(albumIdx, "album")
          putStr(composerIdx, "composer")
          putStr(albumArtistIdx, "albumArtist")
          putStr(genreIdx, "genre")

          if (yearIdx >= 0 && !cursor.isNull(yearIdx)) {
            val year = cursor.getInt(yearIdx)
            if (year > 0) map.putString("year", year.toString())
          }
          if (trackIdx >= 0 && !cursor.isNull(trackIdx)) {
            // MediaStore encodes track as 1xxx (disc*1000 + track); normalize.
            var track = cursor.getInt(trackIdx)
            if (track > 1000) track %= 1000
            if (track > 0) map.putInt("trackNumber", track)
          }
          if (durIdx >= 0 && !cursor.isNull(durIdx)) {
            map.putInt("duration", cursor.getInt(durIdx))
          }
          if (sizeIdx >= 0 && !cursor.isNull(sizeIdx)) {
            map.putDouble("fileSize", cursor.getLong(sizeIdx).toDouble())
          }
          if (bitrateIdx >= 0 && !cursor.isNull(bitrateIdx)) {
            map.putInt("bitRate", cursor.getInt(bitrateIdx))
          }

          result.putMap(id, map)
        }
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("AUDIO_METADATA_ERROR", e.message, e)
    }
  }

  /**
   * Extracts the embedded cover art for each MediaStore id, caches it as a JPEG
   * in the app cache dir, and returns a map id -> "file://…/artwork/<id>.jpg".
   * Ids with no embedded art are simply omitted (the UI falls back to the
   * bundled default artwork). Already-cached files are reused.
   */
  @ReactMethod
  fun extractArtwork(ids: ReadableArray, promise: Promise) {
    try {
      val result: WritableMap = Arguments.createMap()
      val resolver = reactApplicationContext.contentResolver
      val dir = File(reactApplicationContext.cacheDir, "artwork")
      if (!dir.exists()) dir.mkdirs()

      for (i in 0 until ids.size()) {
        val id = ids.getString(i) ?: continue
        val out = File(dir, "$id.jpg")

        if (out.exists() && out.length() > 0) {
          result.putString(id, "file://${out.absolutePath}")
          continue
        }

        val bmp = loadArtworkBitmap(resolver, id) ?: continue
        try {
          FileOutputStream(out).use { fos ->
            bmp.compress(Bitmap.CompressFormat.JPEG, 88, fos)
          }
          result.putString(id, "file://${out.absolutePath}")
        } catch (_: Exception) {
          // ignore single-file write failures
        } finally {
          bmp.recycle()
        }
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("AUDIO_ARTWORK_ERROR", e.message, e)
    }
  }

  private fun loadArtworkBitmap(
    resolver: android.content.ContentResolver,
    id: String,
  ): Bitmap? {
    val mediaId = id.toLongOrNull() ?: return null
    val uri = ContentUris.withAppendedId(
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaId,
    )

    // Modern path (API 29+): a downscaled thumbnail of the associated art.
    // A thrown exception here means the item simply has no art — don't fall
    // back to the (much slower) retriever on these versions.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return try {
        resolver.loadThumbnail(uri, Size(512, 512), null)
      } catch (_: Exception) {
        null
      }
    }

    // Legacy fallback (< API 29): pull the embedded picture from the file tags.
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(reactApplicationContext, uri)
      val bytes = retriever.embeddedPicture ?: return null
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (_: Exception) {
      null
    } finally {
      try { retriever.release() } catch (_: Exception) {}
    }
  }
}
