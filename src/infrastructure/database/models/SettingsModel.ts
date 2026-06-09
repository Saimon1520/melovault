import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class SettingsModel extends Model {
  static table = 'settings';

  @text('key') key: string;
  @text('value') value: string;
  @readonly @date('updated_at') updatedAt: Date;
}
