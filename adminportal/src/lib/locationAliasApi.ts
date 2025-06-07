import { supabase } from './supabaseClient'

export interface LocationAlias {
  id: string
  alias: string
  normalized_location: string
  created_at: string
  created_by_name?: string
}

export interface CreateAliasData {
  alias: string
  normalized_location: string
}

export async function getCompanyAliases(companyId: string): Promise<LocationAlias[]> {
  const { data, error } = await supabase.rpc('get_company_aliases', {
    p_company_id: companyId
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data || []
}

export async function createLocationAlias(
  companyId: string, 
  aliasData: CreateAliasData
): Promise<void> {
  const { data, error } = await supabase.rpc('upsert_location_alias', {
    p_company_id: companyId,
    p_alias: aliasData.alias,
    p_normalized_location: aliasData.normalized_location
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  if (data?.success === false) {
    throw new Error(data.error || 'Failed to create location alias')
  }
}

export async function deleteLocationAlias(aliasId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_location_alias', {
    p_alias_id: aliasId
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  if (data?.success === false) {
    throw new Error(data.error || 'Failed to delete location alias')
  }
} 