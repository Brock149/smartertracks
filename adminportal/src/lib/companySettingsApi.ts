import { supabase } from './supabaseClient'

export interface CompanySettings {
  id: string
  company_id: string
  default_location: string
  default_owner_id: string | null
  default_owner_name?: string
  use_default_location: boolean
  use_default_owner: boolean
  created_at: string
  updated_at: string
}

export interface UpdateSettingsData {
  default_location: string
  default_owner_id: string | null
  use_default_location: boolean
  use_default_owner: boolean
}

export async function getMyCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase.rpc('get_my_company_settings')
  
  if (error) {
    throw new Error(error.message)
  }
  
  if (data?.error) {
    throw new Error(data.error)
  }
  
  return data?.settings || data || null
}

export async function updateCompanySettings(
  companyId: string, 
  settings: UpdateSettingsData
): Promise<CompanySettings> {
  const { data, error } = await supabase.rpc('upsert_company_settings', {
    p_company_id: companyId,
    p_default_location: settings.default_location,
    p_default_owner_id: settings.default_owner_id || null,
    p_use_default_location: settings.use_default_location,
    p_use_default_owner: settings.use_default_owner
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  if (data?.success === false) {
    throw new Error(data.error || 'Failed to update settings')
  }
  
  return data
} 