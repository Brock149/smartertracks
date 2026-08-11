import Constants from 'expo-constants';
import { supabase } from '../supabase/client';

export type ToolSearchScope = 'global' | 'company' | 'group' | 'mine';

export interface ToolSearchResult {
  id: string;
  number: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  owner_name: string | null;
  location: string;
  stored_at?: string;
  primary_thumb_url?: string | null;
  primary_image_url?: string | null;
  match_rank?: number;
  include_in_global_search?: boolean;
  company_id?: string;
  current_owner?: string | null;
}

export interface SearchToolsParams {
  q: string;
  limit?: number;
  offset?: number;
  scope?: ToolSearchScope;
  groupId?: string | null;
  ownerId?: string | null;
}

export async function searchTools(params: SearchToolsParams): Promise<ToolSearchResult[]> {
  const term = (params.q || '').trim();
  if (!term) return [];

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('No active session');

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = (Constants.expoConfig?.extra || {}) as Record<
    string,
    string
  >;
  const supabaseUrl = SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const limit = Math.min(params.limit ?? 50, 100);
  const offset = Math.max(params.offset ?? 0, 0);
  const scope = params.scope ?? 'global';

  const qs = new URLSearchParams({
    q: term,
    limit: String(limit),
    offset: String(offset),
    scope,
  });
  if (scope === 'group' && params.groupId) qs.set('group_id', params.groupId);
  if (params.ownerId) qs.set('owner_id', params.ownerId);

  const resp = await fetch(`${supabaseUrl}/functions/v1/search-tools?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!resp.ok) {
    throw new Error(`Search failed (${resp.status})`);
  }

  const json = await resp.json();
  return (json?.results || []) as ToolSearchResult[];
}
