import { supabase } from '../lib/supabase';
import { SavedLink } from '../types';
import { storage } from '../utils/storage'; // Only used for clearing local storage after migration

export const CloudSync = {
  // Syncs links from the cloud database to the app state.
  syncLinks: async (userId: string): Promise<SavedLink[]> => {
    if (!userId) return [];
    if (!supabase) {
      console.error('Supabase client is not initialized for syncLinks.');
      return [];
    }

    const { data, error } = await supabase
      .from('links')
      .select('id, url, title, favicon, notes, tags, starred, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error syncing links from cloud:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      url: item.url,
      title: item.title,
      favicon: item.favicon || undefined,
      notes: item.notes || '',
      tags: item.tags || [],
      starred: item.starred || false,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    }));
  },

  // Saves a single link to the cloud database.
  saveLink: async (userId: string, link: SavedLink): Promise<void> => {
    if (!userId) return;
    if (!supabase) {
      console.error('Supabase client is not initialized for saveLink.');
      return;
    }

    const { error } = await supabase
      .from('links')
      .upsert({
        id: link.id,
        user_id: userId,
        url: link.url,
        title: link.title,
        favicon: link.favicon,
        notes: link.notes,
        tags: link.tags,
        starred: link.starred,
        created_at: link.createdAt.toISOString(),
        updated_at: link.updatedAt.toISOString(),
      });

    if (error) {
      console.error('Error saving link to cloud:', error);
      throw error;
    }
  },

  // Deletes a single link from the cloud database.
  deleteLink: async (userId: string, linkId: string): Promise<void> => {
    if (!userId) return;
    if (!supabase) {
      console.error('Supabase client is not initialized for deleteLink.');
      return;
    }

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting link from cloud:', error);
      throw error;
    }
  },

  // No longer needed as local storage for links is removed
  // migrateLocalToCloud: async (userId: string): Promise<void> => {
  //   const localLinks = storage.getLinks();
  //   if (localLinks.length > 0) {
  //     console.log('Migrating local links to cloud...', localLinks);
  //     // Batch insert or upsert local links to cloud
  //     const { error } = await supabase
  //       .from('links')
  //       .upsert(localLinks.map(link => ({
  //         id: link.id,
  //         user_id: userId,
  //         url: link.url,
  //         title: link.title,
  //         favicon: link.favicon,
  //         notes: link.notes,
  //         tags: link.tags,
  //         starred: link.starred,
  //         created_at: link.createdAt.toISOString(),
  //         updated_at: link.updatedAt.toISOString(),
  //       })));

  //     if (error) {
  //       console.error('Error migrating local links:', error);
  //       throw error;
  //     }
  //     // Clear local storage after successful migration
  //     storage.saveLinks([]);
  //     console.log('Local links migrated and cleared.');
  //   }
  // },
};