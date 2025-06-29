import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { SavedLink, AppState } from '../types';
import { storage, generateId } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import { CloudSync } from '../utils/cloudSync';

interface AppContextType extends AppState {
  addLink: (link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLink: (id: string, updates: Partial<SavedLink>) => void;
  deleteLink: (id: string) => void;
  toggleStar: (id: string) => void;
  reorderLinks: (links: SavedLink[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSortBy: (sort: 'newest' | 'oldest' | 'starred') => void;
  setShowStarredOnly: (show: boolean) => void;
  toggleDarkMode: () => void;
  clearAllFilters: () => void;
  importLinks: (links: Partial<SavedLink>[]) => void;
  syncStatus: 'idle' | 'syncing' | 'error';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type Action =
  | { type: 'SET_LINKS'; payload: SavedLink[] }
  | { type: 'ADD_LINK'; payload: SavedLink }
  | { type: 'UPDATE_LINK'; payload: { id: string; updates: Partial<SavedLink> } }
  | { type: 'DELETE_LINK'; payload: string }
  | { type: 'TOGGLE_STAR'; payload: string }
  | { type: 'REORDER_LINKS'; payload: SavedLink[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_TAGS'; payload: string[] }
  | { type: 'SET_SORT_BY'; payload: 'newest' | 'oldest' | 'starred' }
  | { type: 'SET_SHOW_STARRED_ONLY'; payload: boolean }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'IMPORT_LINKS'; payload: SavedLink[] }
  | { type: 'SET_SYNC_STATUS'; payload: 'idle' | 'syncing' | 'error' };

const initialState: AppState = {
  links: [],
  tags: [],
  searchQuery: '',
  selectedTags: [],
  sortBy: 'newest',
  showStarredOnly: false,
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LINKS': {
      const allTags = [...new Set(action.payload.flatMap(link => link.tags))].sort();
      return { ...state, links: action.payload, tags: allTags };
    }
    
    case 'ADD_LINK': {
      const newLinks = [action.payload, ...state.links];
      const allTags = [...new Set(newLinks.flatMap(link => link.tags))].sort();
      return { ...state, links: newLinks, tags: allTags };
    }
    
    case 'UPDATE_LINK': {
      const updatedLinks = state.links.map(link =>
        link.id === action.payload.id
          ? { ...link, ...action.payload.updates, updatedAt: new Date() }
          : link
      );
      const allTags = [...new Set(updatedLinks.flatMap(link => link.tags))].sort();
      return { ...state, links: updatedLinks, tags: allTags };
    }
    
    case 'DELETE_LINK': {
      const filteredLinks = state.links.filter(link => link.id !== action.payload);
      const allTags = [...new Set(filteredLinks.flatMap(link => link.tags))].sort();
      return { ...state, links: filteredLinks, tags: allTags };
    }
    
    case 'TOGGLE_STAR': {
      const updatedLinks = state.links.map(link =>
        link.id === action.payload
          ? { ...link, starred: !link.starred, updatedAt: new Date() }
          : link
      );
      return { ...state, links: updatedLinks };
    }
    
    case 'REORDER_LINKS':
      return { ...state, links: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.payload };
    
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    
    case 'SET_SHOW_STARRED_ONLY':
      return { ...state, showStarredOnly: action.payload };
    
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    
    case 'CLEAR_FILTERS':
      return {
        ...state,
        searchQuery: '',
        selectedTags: [],
        showStarredOnly: false,
        sortBy: 'newest'
      };
    
    case 'IMPORT_LINKS': {
      const existingUrls = new Set(state.links.map(link => link.url));
      const newLinks = action.payload.filter(link => !existingUrls.has(link.url));
      const allLinks = [...newLinks, ...state.links];
      const allTags = [...new Set(allLinks.flatMap(link => link.tags))].sort();
      return { ...state, links: allLinks, tags: allTags };
    }
    
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, { ...initialState, syncStatus: 'idle' });
  const { user, loading: authLoading } = useAuth();

  // Load data on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return;

      if (user) {
        // User is signed in - sync from cloud
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
        try {
          const cloudLinks = await CloudSync.syncLinks(user.id);
          dispatch({ type: 'SET_LINKS', payload: cloudLinks });
          
          // Migrate local links to cloud if any exist
          const localLinks = storage.getLinks();
          if (localLinks.length > 0) {
            await CloudSync.migrateLocalToCloud(user.id);
            // Reload after migration
            const updatedCloudLinks = await CloudSync.syncLinks(user.id);
            dispatch({ type: 'SET_LINKS', payload: updatedCloudLinks });
          }
          
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
        } catch (error) {
          console.error('Error loading cloud data:', error);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          // Fallback to local storage
          const savedLinks = storage.getLinks();
          dispatch({ type: 'SET_LINKS', payload: savedLinks });
        }
      } else {
        // User not signed in - use local storage
        const savedLinks = storage.getLinks();
        dispatch({ type: 'SET_LINKS', payload: savedLinks });
      }

      // Load settings
      const savedSettings = storage.getSettings();
      if (savedSettings.darkMode !== undefined) {
        if (savedSettings.darkMode !== state.darkMode) {
          dispatch({ type: 'TOGGLE_DARK_MODE' });
        }
      }
    };

    loadData();
  }, [user, authLoading]);

  // Save links when they change
  useEffect(() => {
    if (state.links.length > 0 || storage.getLinks().length > 0) {
      if (user) {
        // Save to cloud for authenticated users
        // Note: Individual operations handle cloud sync
      } else {
        // Save to local storage for anonymous users
        storage.saveLinks(state.links);
      }
    }
  }, [state.links, user]);

  // Save settings when they change
  useEffect(() => {
    storage.saveSettings({ darkMode: state.darkMode });
  }, [state.darkMode]);

  // Apply dark mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const addLink = async (linkData: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLink: SavedLink = {
      ...linkData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    dispatch({ type: 'ADD_LINK', payload: newLink });
    
    // Sync to cloud if user is authenticated
    if (user) {
      try {
        await CloudSync.saveLink(user.id, newLink);
      } catch (error) {
        console.error('Error syncing link to cloud:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
  };

  const updateLink = async (id: string, updates: Partial<SavedLink>) => {
    dispatch({ type: 'UPDATE_LINK', payload: { id, updates } });
    
    // Sync to cloud if user is authenticated
    if (user) {
      try {
        const updatedLink = state.links.find(link => link.id === id);
        if (updatedLink) {
          await CloudSync.saveLink(user.id, { ...updatedLink, ...updates, updatedAt: new Date() });
        }
      } catch (error) {
        console.error('Error syncing link update to cloud:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
  };

  const deleteLink = async (id: string) => {
    dispatch({ type: 'DELETE_LINK', payload: id });
    
    // Sync to cloud if user is authenticated
    if (user) {
      try {
        await CloudSync.deleteLink(user.id, id);
      } catch (error) {
        console.error('Error deleting link from cloud:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
  };

  const toggleStar = async (id: string) => {
    dispatch({ type: 'TOGGLE_STAR', payload: id });
    
    // Sync to cloud if user is authenticated
    if (user) {
      try {
        const link = state.links.find(l => l.id === id);
        if (link) {
          await CloudSync.saveLink(user.id, { ...link, starred: !link.starred, updatedAt: new Date() });
        }
      } catch (error) {
        console.error('Error syncing star toggle to cloud:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
  };

  const reorderLinks = (links: SavedLink[]) => {
    dispatch({ type: 'REORDER_LINKS', payload: links });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const setSelectedTags = (tags: string[]) => {
    dispatch({ type: 'SET_SELECTED_TAGS', payload: tags });
  };

  const setSortBy = (sort: 'newest' | 'oldest' | 'starred') => {
    dispatch({ type: 'SET_SORT_BY', payload: sort });
  };

  const setShowStarredOnly = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_STARRED_ONLY', payload: show });
  };

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const clearAllFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  const importLinks = (linksData: Partial<SavedLink>[]) => {
    const validLinks: SavedLink[] = linksData.map(linkData => ({
      id: generateId(),
      url: linkData.url || '',
      title: linkData.title || 'Untitled',
      favicon: linkData.favicon,
      notes: linkData.notes || '',
      tags: linkData.tags || [],
      starred: linkData.starred || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    dispatch({ type: 'IMPORT_LINKS', payload: validLinks });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addLink,
        updateLink,
        deleteLink,
        toggleStar,
        reorderLinks,
        setSearchQuery,
        setSelectedTags,
        setSortBy,
        setShowStarredOnly,
        toggleDarkMode,
        clearAllFilters,
        importLinks
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}