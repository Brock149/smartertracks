import { supabase } from './supabaseClient'

export type ToolSearchScope = 'global' | 'company' | 'group' | 'mine'

export interface ToolSearchResult {
  id: string
  number: string
  name: string
  description: string | null
  photo_url: string | null
  owner_name: string | null
  location: string
  stored_at?: string
  primary_thumb_url?: string | null
  primary_image_url?: string | null
  match_rank?: number
  include_in_global_search?: boolean
  company_id?: string
  current_owner?: string | null
}

export interface SearchToolsParams {
  q: string
  limit?: number
  offset?: number
  scope?: ToolSearchScope
  groupId?: string | null
  ownerId?: string | null
}

export async function searchTools(params: SearchToolsParams): Promise<ToolSearchResult[]> {
  const term = (params.q || '').trim()
  if (!term) return []

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const limit = Math.min(params.limit ?? 50, 100)
  const offset = Math.max(params.offset ?? 0, 0)
  const scope = params.scope ?? 'global'

  const qs = new URLSearchParams({
    q: term,
    limit: String(limit),
    offset: String(offset),
    scope,
  })
  if (scope === 'group' && params.groupId) qs.set('group_id', params.groupId)
  if (params.ownerId) qs.set('owner_id', params.ownerId)

  const resp = await fetch(`${supabaseUrl}/functions/v1/search-tools?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  })

  if (!resp.ok) {
    throw new Error(`Search failed (${resp.status})`)
  }

  const json = await resp.json()
  return (json?.results || []) as ToolSearchResult[]
}

export interface ToolSearchAlias {
  id: string
  alias: string
  source: string
  created_at: string
}

export async function listToolSearchAliases(toolId: string): Promise<ToolSearchAlias[]> {
  const { data, error } = await supabase.rpc('list_tool_search_aliases', {
    p_tool_id: toolId,
  })
  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertToolSearchAlias(toolId: string, alias: string): Promise<void> {
  const { data, error } = await supabase.rpc('upsert_tool_search_alias', {
    p_tool_id: toolId,
    p_alias: alias,
    p_source: 'manual',
  })
  if (error) throw new Error(error.message)
  if (data?.success === false) throw new Error(data.error || 'Failed to save alias')
}

export async function deleteToolSearchAlias(aliasId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_tool_search_alias', {
    p_alias_id: aliasId,
  })
  if (error) throw new Error(error.message)
  if (data?.success === false) throw new Error(data.error || 'Failed to delete alias')
}

export async function setToolIncludeInGlobalSearch(toolId: string, include: boolean): Promise<void> {
  const { data, error } = await supabase.rpc('set_tool_include_in_global_search', {
    p_tool_id: toolId,
    p_include: include,
  })
  if (error) throw new Error(error.message)
  if (data?.success === false) throw new Error(data.error || 'Failed to update setting')
}

export async function regenerateToolAliases(toolId: string): Promise<string[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-tool-aliases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tool_id: toolId }),
  })

  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error || `Alias generation failed (${resp.status})`)
  return json?.aliases || []
}

export async function backfillToolAliases(opts?: {
  limit?: number
  offset?: number
  onlyMissing?: boolean
}): Promise<any> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const resp = await fetch(`${supabaseUrl}/functions/v1/backfill-tool-aliases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: opts?.limit ?? 25,
      offset: opts?.offset ?? 0,
      only_missing: opts?.onlyMissing !== false,
    }),
  })

  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error || `Backfill failed (${resp.status})`)
  return json
}
