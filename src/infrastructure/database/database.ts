import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { dbSchema } from './schema';
import { migrations } from './migrations';
import { SongModel } from './models/SongModel';
import { PlaylistModel } from './models/PlaylistModel';
import { PlaylistSongModel } from './models/PlaylistSongModel';
import { PlayerStateModel } from './models/PlayerStateModel';
import { EqualizerPresetModel } from './models/EqualizerPresetModel';
import { SettingsModel } from './models/SettingsModel';

let _db: Database | null = null;

export function getDatabase(): Database {
  if (_db) return _db;

  const adapter = new SQLiteAdapter({
    schema: dbSchema,
    migrations,
    jsi: false,
    onSetUpError: (error) => {
      console.error('[Database] Setup failed:', error);
    },
  });

  _db = new Database({
    adapter,
    modelClasses: [
      SongModel,
      PlaylistModel,
      PlaylistSongModel,
      PlayerStateModel,
      EqualizerPresetModel,
      SettingsModel,
    ],
  });

  return _db;
}

// Lazy proxy so existing `database.collections.get(...)` calls still work
// without changing every import site.
export const database = new Proxy({} as Database, {
  get(_target, prop: string | symbol) {
    return (getDatabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
