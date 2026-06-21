import type { Song } from '@/shared/types';
import { shouldRememberPosition } from './positionPolicy';

// How close to the end still counts as "finished". A song parked within this
// window of its end should restart from 0 when chosen again, instead of
// resuming at the very end and instantly firing PlaybackQueueEnded (which read
// as "it pauses but won't advance or restart").
export const END_GUARD_MS = 3000;

/** True when a saved position sits at (or within END_GUARD_MS of) the end. */
export function isAtEnd(positionMs: number, durationMs: number): boolean {
  if (positionMs <= 0) return true;
  return durationMs > 0 && positionMs >= durationMs - END_GUARD_MS;
}

/**
 * The position (ms) a song should start at when the user plays it directly:
 * its remembered position, unless it doesn't opt into position memory or it was
 * left at the end — in which case it restarts from 0.
 */
export async function resolveResumePosition(song: Song): Promise<number> {
  if (!(await shouldRememberPosition(song))) return 0;
  const pos = song.lastPosition ?? 0;
  if (isAtEnd(pos, song.duration)) return 0;
  return pos;
}
