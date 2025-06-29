export interface SavedLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  notes?: string;
  tags: string[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedCollection {
  id: string;
  title: string;
  description?: string;
  links: SavedLink[];
  createdAt: Date;
}

export interface AppState {
  links: SavedLink[];
  tags: string[];
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'newest' | 'oldest' | 'starred';
  showStarredOnly: boolean;
  darkMode: boolean;
  syncStatus?: 'idle' | 'syncing' | 'error';
}

export interface LinkFormData {
  url: string;
  title: string;
  notes: string;
  tags: string[];
}

export type ViewMode = 'list' | 'cards';
export type FilterType = 'all' | 'starred' | 'tags';