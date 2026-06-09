import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class PlaylistSongModel extends Model {
  static table = 'playlist_songs';

  @field('playlist_id') playlistId: string;
  @field('song_id') songId: string;
  @field('position') position: number;
  @field('added_at') addedAt: number;
}
