import { supabase } from './supabaseClient';
import type { CompanySettingsWithAliases } from '../types/database';

export async function getCompanySettings(): Promise<CompanySettingsWithAliases> {
  const { data, error } = await supabase.functions.invoke('get-company-settings', {
    method: 'GET'
  });

  if (error) throw error;
  return data;
}

export async function updateCompanySettings(
  defaultLocation: string | null,
  locationAliases: Array<{ alias: string; standardized_location: string }>
): Promise<void> {
  const { error } = await supabase.functions.invoke('update-company-settings', {
    method: 'POST',
    body: { 
      defaultLocation,
      locationAliases
    }
  });

  if (error) throw error;
}

export async function applyLocationAlias(): Promise<void> {
  const { error } = await supabase.functions.invoke('apply-location-alias', {
    method: 'POST'
  });

  if (error) throw error;
} 