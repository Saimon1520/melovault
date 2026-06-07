import type { AudioFormat } from '@/shared/types';

export const SUPPORTED_AUDIO_FORMATS: AudioFormat[] = [
  'mp3', 'flac', 'aac', 'ogg', 'wav', 'm4a', 'opus', 'wma',
];

export const AUDIO_FORMAT_EXTENSIONS = SUPPORTED_AUDIO_FORMATS.map(f => `.${f}`);

export const SEEK_SECONDS_DEFAULT = 10; // seconds to seek back/forward
export const SEEK_SECONDS_OPTIONS = [5, 10, 15, 30] as const;

export const CROSSFADE_DEFAULT_MS = 0; // disabled
export const CROSSFADE_MAX_MS = 12000;

export const SLEEP_TIMER_OPTIONS_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90] as const;
