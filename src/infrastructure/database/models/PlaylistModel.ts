import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class PlaylistModel extends Model {
  static table = 'playlists';

  @text('name') name: string;
  @text('description') description: string;
  @text('artwork_path') artworkPath: string;
  @field('keep_position') keepPosition: boolean;
  @text('last_song_id') lastSongId: string;
  @field('last_position_ms') lastPositionMs: number;
  @field('shuffle_enabled') shuffleEnabled: boolean;
  @text('repeat_mode') repeatMode: string;
  @text('sort_order') sortOrder: string;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
