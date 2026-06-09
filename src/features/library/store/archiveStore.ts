import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '@/shared/types';

// Heuristic: notification tones, WhatsApp/Telegram voice notes, app UI sounds…
// — basically short, artist-less audio that isn't really "music".
export function isLikelyNonMusic(song: Song): boolean {
  const hay = `${song.filePath} ${song.title} ${song.album ?? ''}`.toLowerCase();
  const messaging =
    /whatsapp|telegram|\bptt\b|aud[-_]?\d|wa\d{3,}|voice[ _-]?note|grabaci|recording|notification|ringtone|alarm|\/sounds?\b|\bui[ _-]?sounds?\b|slack|messenger|\.ogg$/;
  if (messaging.test(hay)) return true;
  const noArtist = !song.artist || song.artist === 'Unknown Artist' || song.artist.trim() === '';
  const short = song.duration > 0 && song.duration < 90_000; // < 90s (duration is ms)
  return noArtist && short;
}

/**
 * Songs the user keeps out of the main library (like WhatsApp's archived chats).
 * Manual overrides win over the heuristic so the user stays in control.
 */
interface ArchiveStore {
  archivedIds: string[];   // forced archived
  unarchivedIds: string[]; // forced visible (overrides the heuristic)
  isArchived: (song: Song) => boolean;
  setArchived: (songId: string, archived: boolean) => void;
}

export const useArchiveStore = create<ArchiveStore>()(
  persist(
    (set, get) => ({
      archivedIds: [],
      unarchivedIds: [],
      isArchived: (song) => {
        const { archivedIds, unarchivedIds } = get();
        if (archivedIds.includes(song.id)) return true;
        if (unarchivedIds.includes(song.id)) return false;
        return isLikelyNonMusic(song);
      },
      setArchived: (songId, archived) =>
        set((s) => ({
          archivedIds: archived
            ? [...new Set([...s.archivedIds, songId])]
            : s.archivedIds.filter((id) => id !== songId),
          unarchivedIds: archived
            ? s.unarchivedIds.filter((id) => id !== songId)
            : [...new Set([...s.unarchivedIds, songId])],
        })),
    }),
    {
      name: '@melovault/archive',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
