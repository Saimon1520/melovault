import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class PlayerStateModel extends Model {
  static table = 'player_state';

  @text('current_song_id') currentSongId: string;
  @text('current_playlist_id') currentPlaylistId: string;
  @field('position_ms') positionMs: number;
  @field('volume') volume: number;
  @field('speed') speed: number;
  @field('shuffle_enabled') shuffleEnabled: boolean;
  @text('repeat_mode') repeatMode: string;
  @text('equalizer_preset_id') equalizerPresetId: string;
  @readonly @date('updated_at') updatedAt: Date;
}
