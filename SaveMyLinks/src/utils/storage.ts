import { SavedLink, SharedCollection, AppState } from '../types';

const STORAGE_KEYS = {
  LINKS: 'savemylinks_links',
  SHARED_COLLECTIONS: 'savemylinks_shared',
  SETTINGS: 'savemylinks_settings',
  REPORTS: 'savemylinks_reports'
};

export const storage = {
  // Links management
  getLinks: (): SavedLink[] => {
    try {
      const links = localStorage.getItem(STORAGE_KEYS.LINKS);
      return links ? JSON.parse(links).map((link: any) => ({
        ...link,
        createdAt: new Date(link.createdAt),
        updatedAt: new Date(link.updatedAt)
      })) : [];
    } catch (error) {
      console.error('Error loading links:', error);
      return [];
    }
  },

  saveLinks: (links: SavedLink[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
    } catch (error) {
      console.error('Error saving links:', error);
    }
  },

  // Shared collections
  getSharedCollections: (): Record<string, SharedCollection> => {
    try {
      const collections = localStorage.getItem(STORAGE_KEYS.SHARED_COLLECTIONS);
      return collections ? JSON.parse(collections) : {};
    } catch (error) {
      console.error('Error loading shared collections:', error);
      return {};
    }
  },

  saveSharedCollection: (collection: SharedCollection): void => {
    try {
      const collections = storage.getSharedCollections();
      collections[collection.id] = collection;
      localStorage.setItem(STORAGE_KEYS.SHARED_COLLECTIONS, JSON.stringify(collections));
    } catch (error) {
      console.error('Error saving shared collection:', error);
    }
  },

  getSharedCollection: (id: string): SharedCollection | null => {
    const collections = storage.getSharedCollections();
    return collections[id] || null;
  },

  // Settings
  getSettings: (): Partial<AppState> => {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  },

  saveSettings: (settings: Partial<AppState>): void => {
    try {
      const currentSettings = storage.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  // Reports
  addReport: (collectionId: string, reason: string): void => {
    try {
      const reports = localStorage.getItem(STORAGE_KEYS.REPORTS);
      const reportsList = reports ? JSON.parse(reports) : [];
      reportsList.push({
        id: generateId(),
        collectionId,
        reason,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reportsList));
    } catch (error) {
      console.error('Error saving report:', error);
    }
  }
};

export const generateId = (): string => {
  return crypto.randomUUID();
};

export const generateShareId = (): string => {
  return Math.random().toString(36).substr(2, 6);
};