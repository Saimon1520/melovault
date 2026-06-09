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
  if (usePositionMemoryStore.getState().isRemembered(id)) return true;
  return playlistRepo.songIsInKeepPositionPlaylist(id);
}
