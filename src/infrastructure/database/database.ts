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

const adapter = new SQLiteAdapter({
  schema: dbSchema,
  migrations,
  jsi: false,
  onSetUpError: (error) => {
    console.error('[Database] Setup failed:', error);
  },
});

export const database = new Database({
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
