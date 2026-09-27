import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavedPlayerState {
  currentTrackId: string;
  // Resume point honoring the per-song "remember position" opt-in (0 otherwise).
  position: number;
  queueIndex: number;
  // Where playback actually was (ms), whatever the opt-in, and whether it was
  // still playing at that save. If the process dies while playing (Android
  // killed it for RAM), the next launch resumes here instead of at 0.
  sessionPosition?: number;
  wasPlaying?: boolean;
}

const KEY = '@melovault/player_state';

export class PlayerStateRepository {
  async save(state: SavedPlayerState): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  }

  async load(): Promise<SavedPlayerState | null> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedPlayerState;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  }
}
