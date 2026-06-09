import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class EqualizerPresetModel extends Model {
  static table = 'equalizer_presets';

  @text('name') name: string;
  @field('is_default') isDefault: boolean;
  @text('bands') bands: string; // JSON: [{frequency, gain}, ...]
  @readonly @date('created_at') createdAt: Date;
}
