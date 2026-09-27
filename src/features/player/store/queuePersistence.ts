import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from './playerStore';

// The play queue lives only in memory (zustand + the native player), so when
// Android kills the process in the background (low RAM) the user came back to a
// lone song with nothing after it. Persist the queue as song ids so
// restoreLastSession can rebuild it.
const KEY = '@melovault/queue_state';
const SAVE_DEBOUNCE_MS = 1000;

export interface SavedQueue {
  queueIds: string[];
  originalIds: string[];
  contextId: string | null;
  shuffle: boolean;
}

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function save(): void {
  const { queue, originalQueue, queueContextId, shuffleEnabled } = usePlayerStore.getState();
  const data: SavedQueue = {
    queueIds: queue.map(s => s.id),
    originalIds: originalQueue.map(s => s.id),
    contextId: queueContextId,
    shuffle: shuffleEnabled,
  };
  // A failed write (e.g. storage full) only costs the restore — never playback.
  AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
}

export function startQueuePersistence(): void {
  if (unsubscribe) return;
  unsubscribe = usePlayerStore.subscribe((s, prev) => {
    if (
      s.queue === prev.queue &&
      s.originalQueue === prev.originalQueue &&
      s.queueContextId === prev.queueContextId &&
      s.shuffleEnabled === prev.shuffleEnabled
    ) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, SAVE_DEBOUNCE_MS);
  });
}

export async function loadSavedQueue(): Promise<SavedQueue | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedQueue;
    return Array.isArray(data?.queueIds) ? data : null;
  } catch {
    return null;
  }
}
