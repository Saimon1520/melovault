import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class SongModel extends Model {
  static table = 'songs';

  @text('file_path') filePath!: string;
  @text('title') title!: string;
  @text('artist') artist!: string;
  @text('album') album!: string;
  @text('album_artist') albumArtist!: string;
  @text('year') year!: string;
  @text('genre') genre!: string;
  @field('duration') duration!: number;
  @field('file_size') fileSize!: number;
  @field('bit_rate') bitRate!: number;
  @field('sample_rate') sampleRate!: number;
  @field('track_number') trackNumber!: number;
  @field('disc_number') discNumber!: number;
  @text('artwork_path') artworkPath!: string;
  @field('artwork_embedded') artworkEmbedded!: boolean;
  @text('label') label!: string;
  @text('composer') composer!: string;
  @text('comment') comment!: string;
  @text('source') source!: string;
  @text('lyrics') lyrics!: string;
  @text('lyrics_synced') lyricsSynced!: string;
  @text('extra_metadata') extraMetadata!: string; // JSON string
  @field('is_hidden') isHidden!: boolean;
  @field('play_count') playCount!: number;
  @field('last_played') lastPlayed!: number;
  @field('last_position') lastPosition!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
