import type { Song } from '@/shared/types';
import { PlaylistRepository } from '@/features/playlists/data/repositories/PlaylistRepository';
import { usePositionMemoryStore } from '@/features/player/store/positionMemoryStore';

const playlistRepo = new PlaylistRepository();

/**
 * A song resumes where you left off when EITHER it's been opted in per-song, OR
 * it belongs to a playlist configured to remember position. This lets a user
 * opt a single track in without creating a playlist, while tracks already in a
 * position-remembering playlist inherit it automatically.
 */
export async function shouldRememberPosition(songOrId: Song | string): Promise<boolean> {
  const id = typeof songOrId === 'string' ? songOrId : songOrId.id;
  if (isRememberedNow(id)) return true;
  return inheritsKeepPositionPlaylist(id);
}

// The per-song opt-in, read straight from the store every call (it's in memory,
// so this is cheap). Kept separate so the save loop can re-check it on every
// tick — toggling "Recordar posición" mid-playback must take effect at once.
export function isRememberedNow(id: string): boolean {
  return usePositionMemoryStore.getState().isRemembered(id);
}

// Whether the song inherits position-memory from a playlist. This hits the DB,
// so callers may cache it per active track (invalidated on track change).
export async function inheritsKeepPositionPlaylist(id: string): Promise<boolean> {
  return playlistRepo.songIsInKeepPositionPlaylist(id);
}
