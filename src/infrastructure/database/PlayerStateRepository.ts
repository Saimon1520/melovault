import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavedPlayerState {
  currentTrackId: string;
  position: number;
  queueIndex: number;
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
