import { supabase } from '../lib/supabase';
import { SavedLink } from '../types';
import { storage } from './storage';

export class CloudSync {
  static async syncLinks(userId: string): Promise<SavedLink[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(link => ({
        id: link.id,
        url: link.url,
        title: link.title,
        favicon: link.favicon || undefined,
        notes: link.notes || '',
        tags: link.tags || [],
        starred: link.starred,
        createdAt: new Date(link.created_at),
        updatedAt: new Date(link.updated_at)
      }));
    } catch (error) {
      console.error('Error syncing links:', error);
      return [];
    }
  }

  static async saveLink(userId: string, link: SavedLink): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('links')
        .upsert({
          id: link.id,
          user_id: userId,
          url: link.url,
          title: link.title,
          favicon: link.favicon || null,
          notes: link.notes || '',
          tags: link.tags,
          starred: link.starred,
          created_at: link.createdAt.toISOString(),
          updated_at: link.updatedAt.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving link to cloud:', error);
      throw error;
    }
  }

  static async deleteLink(userId: string, linkId: string): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting link from cloud:', error);
      throw error;
    }
  }

  static async migrateLocalToCloud(userId: string): Promise<void> {
    if (!supabase) return;

    const localLinks = storage.getLinks();
    if (localLinks.length === 0) return;

    try {
      const linksToInsert = localLinks.map(link => ({
        id: link.id,
        user_id: userId,
        url: link.url,
        title: link.title,
        favicon: link.favicon || null,
        notes: link.notes || '',
        tags: link.tags,
        starred: link.starred,
        created_at: link.createdAt.toISOString(),
        updated_at: link.updatedAt.toISOString()
      }));

      const { error } = await supabase
        .from('links')
        .upsert(linksToInsert);

      if (error) throw error;

      // Clear local storage after successful migration
      storage.saveLinks([]);
    } catch (error) {
      console.error('Error migrating local links to cloud:', error);
      throw error;
    }
  }
}