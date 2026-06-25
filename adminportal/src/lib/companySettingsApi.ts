import { supabase } from './supabaseClient'

export type ExportFrequency = 'weekly' | 'monthly'

export interface CompanySettings {
  id: string
  company_id: string
  default_location: string
  default_owner_id: string | null
  default_owner_name?: string
  use_default_location: boolean
  use_default_owner: boolean
  auto_export_enabled?: boolean
  auto_export_frequency?: ExportFrequency
  auto_export_recipients?: string[]
  auto_export_last_sent_at?: string | null
  company_export_enabled?: boolean
  company_export_frequency?: ExportFrequency
  company_export_recipients?: string[]
  company_export_last_sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateSettingsData {
  default_location: string
  default_owner_id: string | null
  use_default_location: boolean
  use_default_owner: boolean
}

export interface UpdateExportSettingsData {
  enabled: boolean
  recipients: string[]
  frequency: ExportFrequency
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

export async function updateCompanyExportSettings(
  companyId: string,
  settings: UpdateExportSettingsData
): Promise<CompanySettings> {
  const { data, error } = await supabase.rpc('upsert_company_export_settings', {
    p_company_id: companyId,
    p_enabled: settings.enabled,
    p_recipients: settings.recipients,
    p_frequency: settings.frequency,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data?.success === false) {
    throw new Error(data.error || 'Failed to update export settings')
  }

  return data
}

export async function updateCompanyToolsExportSettings(
  companyId: string,
  settings: UpdateExportSettingsData
): Promise<CompanySettings> {
  const { data, error } = await supabase.rpc('upsert_company_tools_export_settings', {
    p_company_id: companyId,
    p_enabled: settings.enabled,
    p_recipients: settings.recipients,
    p_frequency: settings.frequency,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data?.success === false) {
    throw new Error(data.error || 'Failed to update export settings')
  }

  return data
}

/**
 * Trigger a one-off inventory export email to the configured recipients for the
 * admin's own company (a "send test now" action). Uses the admin's session JWT.
 * `type` selects which report: 'personal' (employee tools) or 'company' (company tools).
 */
export async function sendInventoryExportNow(
  type: 'personal' | 'company' = 'personal'
): Promise<{ status: string; detail?: string }> {
  const { data, error } = await supabase.functions.invoke('scheduled-inventory-export', {
    body: { force: true, type },
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = data?.results?.[0]
  if (result && result.status === 'error') {
    throw new Error(result.detail || 'Export failed')
  }
  if (result && result.status === 'skipped') {
    throw new Error(result.detail || 'Nothing to send')
  }
  return result || { status: 'sent' }
} 