import { appSchema, tableSchema } from '@nozbe/watermelondb';

// ⚠️ DATA-LOSS WARNING — read before touching `version`.
// WatermelonDB WIPES the entire database (playlists, playlist order, etc.) on
// app update if the schema `version` here is greater than the one stored on the
// device AND `migrations/index.ts` has no migration covering that step. So:
//   • NEVER bump this number without adding a matching migration entry.
//   • Adding a per-row flag/column? Prefer an AsyncStorage store instead — the
//     jsi:false bridge adapter no-ops addColumns migrations on this setup, so a
//     bump would wipe data without actually adding the column. See the existing
//     archive/positionMemory/favorites stores for the pattern.
// Auto Backup (AndroidManifest allowBackup) is the safety net for reinstalls,
// but in-place updates must never trigger a reset — keep this at 1.
export const dbSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'songs',
      columns: [
        { name: 'file_path', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'artist', type: 'string', isIndexed: true },
        { name: 'album', type: 'string', isIndexed: true },
        { name: 'album_artist', type: 'string' },
        { name: 'year', type: 'string' },
        { name: 'genre', type: 'string' },
        { name: 'duration', type: 'number' },
        { name: 'file_size', type: 'number' },
        { name: 'bit_rate', type: 'number' },
        { name: 'sample_rate', type: 'number' },
        { name: 'track_number', type: 'number' },
        { name: 'disc_number', type: 'number' },
        { name: 'artwork_path', type: 'string' },
        { name: 'artwork_embedded', type: 'boolean' },
        { name: 'label', type: 'string' },
        { name: 'composer', type: 'string' },
        { name: 'comment', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'lyrics', type: 'string' },
        { name: 'lyrics_synced', type: 'string' },
        { name: 'extra_metadata', type: 'string' }, // JSON
        { name: 'is_hidden', type: 'boolean', isIndexed: true },
        { name: 'play_count', type: 'number' },
        { name: 'last_played', type: 'number' },
        { name: 'last_position', type: 'number' }, // ms — persists forever
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'playlists',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'artwork_path', type: 'string' },
        { name: 'keep_position', type: 'boolean' }, // selective persistence
        { name: 'last_song_id', type: 'string' },
        { name: 'last_position_ms', type: 'number' },
        { name: 'shuffle_enabled', type: 'boolean' },
        { name: 'repeat_mode', type: 'string' },
        { name: 'sort_order', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'playlist_songs',
      columns: [
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'song_id', type: 'string', isIndexed: true },
        { name: 'position', type: 'number' },
        { name: 'added_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'player_state',
      columns: [
        { name: 'current_song_id', type: 'string' },
        { name: 'current_playlist_id', type: 'string' },
        { name: 'position_ms', type: 'number' },
        { name: 'volume', type: 'number' },
        { name: 'speed', type: 'number' },
        { name: 'shuffle_enabled', type: 'boolean' },
        { name: 'repeat_mode', type: 'string' },
        { name: 'equalizer_preset_id', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'equalizer_presets',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'is_default', type: 'boolean' },
        { name: 'bands', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'settings',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
