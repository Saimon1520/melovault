import { create } from 'zustand';
import type { Song, SortOrder, SortDirection } from '@/shared/types';

type LibraryTab = 'songs' | 'albums' | 'artists' | 'genres' | 'folders';

interface LibraryStore {
  songs: Song[];
  activeTab: LibraryTab;
  sortOrder: SortOrder;
  sortDirection: SortDirection;
  searchQuery: string;
  isScanning: boolean;
  scanProgress: { scanned: number; total: number; currentFile: string } | null;

  setSongs: (songs: Song[]) => void;
  setActiveTab: (tab: LibraryTab) => void;
  setSortOrder: (order: SortOrder) => void;
  setSortDirection: (dir: SortDirection) => void;
  setSearchQuery: (query: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: LibraryStore['scanProgress']) => void;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  songs: [],
  activeTab: 'songs',
  sortOrder: 'title',
  sortDirection: 'asc',
  searchQuery: '',
  isScanning: false,
  scanProgress: null,

  setSongs: (songs) => set({ songs }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
}));
