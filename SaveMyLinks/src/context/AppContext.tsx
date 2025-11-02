import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { SavedLink, AppState } from '../types';
import { storage } from '../utils/storage'; // Keep import for settings, shared collections, reports
import { generateId } from '../utils/idGenerator'; // Import generateId from new utility
import { useAuth } from '../hooks/useAuth';
import { CloudSync } from '../utils/cloudSync';
import { AddLinkForm } from '../components/AddLinkForm';
import { AuthModal } from '../components/AuthModal'; // Added import for AuthModal
import { User } from '@supabase/supabase-js'; // Added import for User type

export interface AppContextType extends AppState {
  addLink: (link: Omit<SavedLink, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLink: (id: string, updates: Partial<SavedLink>) => void;
  deleteLink: (id: string) => void;
  toggleStar: (id: string) => void;
  reorderLinks: (links: SavedLink[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSortBy: (sort: 'newest' | 'oldest' | 'starred') => void;
  setShowStarredOnly: (show: boolean) => void;
  clearAllFilters: () => void;
  importLinks: (links: Partial<SavedLink>[]) => Promise<SavedLink[]>;
  syncStatus: 'idle' | 'syncing' | 'error';
  setShowRecentsOnly: (show: boolean) => void;
  retrySync: () => void;
  openAddLinkModal: () => void;
  addGlobalTag: (tag: string) => void;
  openAuthModal: () => void; // New: function to open auth modal
  closeAuthModal: () => void; // New: function to close auth modal
  showAuthModal: boolean; // Expose AuthModal visibility state
  user: User | null; // New: Expose user object for conditional rendering
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
  | { type: 'CLEAR_FILTERS' }
  | { type: 'IMPORT_LINKS'; payload: SavedLink[] }
  | { type: 'SET_SYNC_STATUS'; payload: 'idle' | 'syncing' | 'error' }
  | { type: 'SET_SHOW_RECENTS_ONLY'; payload: boolean };

const initialState: AppState = {
  links: [], // Links will always be loaded from cloud or be empty
  tags: [],
  searchQuery: '',
  selectedTags: [],
  sortBy: 'newest',
  showStarredOnly: false,
  darkMode: true, // Always dark mode
  showRecentsOnly: false
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LINKS': {
      const allTags = [...new Set(action.payload.flatMap((link: SavedLink) => link.tags))].sort();
      return { ...state, links: action.payload, tags: allTags };
    }
    
    case 'ADD_LINK': {
      const newLinks = [action.payload, ...state.links];
      const allTags = [...new Set(newLinks.flatMap((link: SavedLink) => link.tags))].sort();
      return { ...state, links: newLinks, tags: allTags };
    }
    
    case 'UPDATE_LINK': {
      const updatedLinks = state.links.map((link: SavedLink) =>
        link.id === action.payload.id
          ? { ...link, ...action.payload.updates, updatedAt: new Date() }
          : link
      );
      const allTags = [...new Set(updatedLinks.flatMap((link: SavedLink) => link.tags))].sort();
      return { ...state, links: updatedLinks, tags: allTags };
    }
    
    case 'DELETE_LINK': {
      const filteredLinks = state.links.filter((link: SavedLink) => link.id !== action.payload);
      const allTags = [...new Set(filteredLinks.flatMap((link: SavedLink) => link.tags))].sort();
      return { ...state, links: filteredLinks, tags: allTags };
    }
    
    case 'TOGGLE_STAR': {
      const updatedLinks = state.links.map((l: SavedLink) =>
        l.id === action.payload
          ? { ...l, starred: !l.starred, updatedAt: new Date() }
          : l
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
    
    case 'CLEAR_FILTERS':
      return {
        ...state,
        searchQuery: '',
        selectedTags: [],
        showStarredOnly: false,
        showRecentsOnly: false,
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
    
    case 'SET_SHOW_RECENTS_ONLY':
      return { ...state, showRecentsOnly: action.payload };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, { ...initialState, syncStatus: 'idle' });
  const { user, loading: authLoading } = useAuth(); // Get user from useAuth
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false); // New state for AuthModal

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
          
          // No more local migration, as local links are removed.
          
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
        } catch (error) {
          console.error('Error loading cloud data:', error);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          // If cloud sync fails, set links to empty, not local storage fallback
          dispatch({ type: 'SET_LINKS', payload: [] });
        }
      } else {
        // User not signed in - links will be empty
        dispatch({ type: 'SET_LINKS', payload: [] });
      }

      // No longer loading settings for dark mode from local storage as it's always dark.
      // Any other settings will still be loaded.
      const savedSettings = storage.getSettings();
      if (savedSettings.darkMode !== undefined) {
        // Keep this check if there are other settings, but not for darkMode here.
      }
    };

    loadData();
  }, [user, authLoading]);

  // No longer saving links to local storage. Individual operations (add, update, delete, import) handle cloud sync.
  useEffect(() => {
    // This useEffect previously saved to local storage. Now it's effectively a no-op for links.
    // Settings are saved via storage.saveSettings directly.
    if (!user && state.links.length > 0) {
      // If user is not authenticated, and there are links in state, they are temporary. No saving.
      // Removed storage.getLinks() call here as it no longer exists.
      console.warn('Links exist in state for unauthenticated user - these will not be saved.');
    }
  }, [state.links, user]);

  // Save settings when they change - now explicitly handled for dark mode if it changes
  useEffect(() => {
    storage.saveSettings({ darkMode: state.darkMode });
  }, [state.darkMode]);

  // Apply dark mode - always add 'dark' class
  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Removed conditional dark mode class removal
  }, []); // Empty dependency array means this runs once on mount

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

  const clearAllFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
    dispatch({ type: 'SET_SHOW_RECENTS_ONLY', payload: false });
  };

  const importLinks = async (linksData: Partial<SavedLink>[]): Promise<SavedLink[]> => {
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

    let successfullyImported: SavedLink[] = [];

    // Sync to cloud if user is authenticated
    if (user) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      try {
        for (const link of validLinks) {
          // Check for existing link before saving to avoid duplicate Supabase calls if it was already in state
          // The appReducer already filters by URL, so we primarily save what's new to the database.
          // However, we need to ensure unique IDs for Supabase to prevent overwrites or errors.
          // For now, assuming dispatch handles local uniqueness, and Supabase will handle its own.
          await CloudSync.saveLink(user.id, link);
          successfullyImported.push(link);
        }
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      } catch (error) {
        console.error('Error syncing imported links to cloud:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
    return successfullyImported;
  };

  const setShowRecentsOnly = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_RECENTS_ONLY', payload: show });
  };

  // Add a retrySync function for retrying cloud sync
  const retrySync = async () => {
    if (user) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      try {
        const cloudLinks = await CloudSync.syncLinks(user.id);
        dispatch({ type: 'SET_LINKS', payload: cloudLinks });
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      } catch (error) {
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }
  };

  // Add openAddLinkModal to open the add link modal
  const openAddLinkModal = () => setShowAddLinkModal(true);

  const openAuthModal = () => setShowAuthModal(true); // New: function to open auth modal

  const closeAuthModal = () => setShowAuthModal(false); // New: function to close auth modal

  // Add a tag to the global tag list if not present
  const addGlobalTag = (tag: string) => {
    if (!state.tags.includes(tag)) {
      // This will update the tags in state by dispatching a dummy link update
      // (since tags are derived from all links, we need to add the tag to at least one link)
      // Instead, we can update the tags array directly in state for this session
      // But to persist, we need to add it to a link, so we leave it to be added to the link on save
      // Here, we update the tags array in state for immediate suggestions
      dispatch({ type: 'SET_LINKS', payload: state.links.map(l => ({ ...l })) });
      state.tags.push(tag);
    }
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
        clearAllFilters,
        importLinks,
        syncStatus: state.syncStatus || "idle",
        setShowRecentsOnly,
        retrySync,
        openAddLinkModal, // added here
        addGlobalTag,
        openAuthModal, // New: add to context provider
        closeAuthModal, // New: add to context provider
        showAuthModal, // Expose AuthModal visibility state
        user, // New: Pass user to context provider
      }}
    >
      {children}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg mx-auto">
            <AddLinkForm onClose={() => setShowAddLinkModal(false)} />
          </div>
        </div>
      )}
      {/* AuthModal controlled by AppContext */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal} // Use new closeAuthModal
      />
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