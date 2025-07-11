import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Fetch values from app.json -> expo.extra
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} = (Constants.expoConfig?.extra || {}) as Record<string, string>;

// Fallback to env vars if running in environments where extra isn't set
const supabaseUrl = SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage implementation using Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Regular client for authenticated operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Allow development and test emails
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'mobile-app',
    },
  },
});

// Removed supabaseAdmin – service-role operations are now handled exclusively via Supabase Edge Functions.

// Types for our database
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'admin' | 'tech';
          created_at: string;
          company_id: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
      };
      company_access_codes: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          role: 'admin' | 'tech';
          created_at: string;
          is_active: boolean;
        };
      };
      tools: {
        Row: {
          id: string;
          number: string;
          name: string;
          current_owner: string | null;
          description: string | null;
          photo_url: string | null;
          created_at: string;
          company_id: string;
        };
      };
      tool_transactions: {
        Row: {
          id: string;
          tool_id: string | null;
          from_user_id: string | null;
          to_user_id: string | null;
          location: string;
          stored_at: string;
          notes: string | null;
          timestamp: string;
          company_id: string;
        };
      };
      tool_checklists: {
        Row: {
          id: string;
          tool_id: string;
          item_name: string;
          required: boolean;
          created_at: string;
          company_id: string;
        };
      };
    };
  };
} 