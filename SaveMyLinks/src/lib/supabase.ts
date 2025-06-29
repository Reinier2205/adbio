import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Cloud sync will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Database = {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          title: string;
          favicon: string | null;
          notes: string | null;
          tags: string[];
          starred: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          title: string;
          favicon?: string | null;
          notes?: string | null;
          tags?: string[];
          starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          title?: string;
          favicon?: string | null;
          notes?: string | null;
          tags?: string[];
          starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};