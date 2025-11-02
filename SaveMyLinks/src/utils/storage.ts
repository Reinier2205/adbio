import { SavedLink, SavedSharedCollection, UserReport, AppSettings } from '../types';

enum STORAGE_KEYS {
  LINKS = 'save_my_links',
  SHARED_COLLECTIONS = 'save_my_links_shared_collections',
  REPORTS = 'save_my_links_reports',
  SETTINGS = 'save_my_links_settings',
}

// Removed getLinks and saveLinks functions

export const storage = {
  // Removed getLinks and saveLinks functions

  getSharedCollections: (): SavedSharedCollection[] => {
    try {
      const collections = localStorage.getItem(STORAGE_KEYS.SHARED_COLLECTIONS);
      return collections ? JSON.parse(collections) : [];
    } catch (e) {
      console.error('Error parsing shared collections from local storage', e);
      return [];
    }
  },

  saveSharedCollection: (collection: SavedSharedCollection) => {
    const collections = storage.getSharedCollections();
    const existingIndex = collections.findIndex(c => c.id === collection.id);
    if (existingIndex > -1) {
      collections[existingIndex] = collection;
    } else {
      collections.push(collection);
    }
    localStorage.setItem(STORAGE_KEYS.SHARED_COLLECTIONS, JSON.stringify(collections));
  },

  getSharedCollection: (id: string): SavedSharedCollection | undefined => {
    const collections = storage.getSharedCollections();
    return collections.find(c => c.id === id);
  },

  getSettings: (): AppSettings => {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (e) {
      console.error('Error parsing settings from local storage', e);
      return {};
    }
  },

  saveSettings: (settings: Partial<AppSettings>) => {
    const currentSettings = storage.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
  },

  getReports: (): UserReport[] => {
    try {
      const reports = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return reports ? JSON.parse(reports) : [];
    } catch (e) {
      console.error('Error parsing reports from local storage', e);
      return [];
    }
  },

  addReport: (id: string, type: string) => {
    const reportsList = storage.getReports();
    const newReport: UserReport = { id, type, timestamp: new Date().toISOString() };
    reportsList.push(newReport);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reportsList));
  },

  // Clear all local storage data, typically on sign out or full reset
  clearAll: () => {
    localStorage.clear();
  },
};