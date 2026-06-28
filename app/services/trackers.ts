import { supabase } from '../supabase/client';

export type MountType = 'temporary' | 'permanent';

export interface PoolTracker {
  serial: string;
  label: string | null;
  assigned_at: string | null;
  last_seen_at: string | null;
  company_number: number | null;
}

/** Friendly tracker name: "Tracker N" when numbered, else label, else serial. */
export function trackerDisplayName(t: { serial: string; label?: string | null; company_number?: number | null }): string {
  if (t.company_number != null) return `Tracker ${t.company_number}`;
  return t.label || t.serial;
}

export interface ToolTracker {
  serial: string;
  mount_type: MountType;
  attached_at: string;
  company_number: number | null;
}

export interface ToolLocation {
  latitude: number | null;
  longitude: number | null;
  recorded_at: string | null;
  updated_at: string | null;
  serial: string | null;
  battery: number | null;
}

/** Trackers assigned to this company but not yet attached to any tool. */
export async function fetchCompanyTrackerPool(): Promise<PoolTracker[]> {
  const { data, error } = await supabase.rpc('company_tracker_pool');
  if (error) {
    console.error('Error fetching company tracker pool:', error);
    throw error;
  }
  return (data || []) as PoolTracker[];
}

/** The tracker currently attached to a tool (or null), plus its mount type. */
export async function fetchToolTracker(toolId: string): Promise<ToolTracker | null> {
  const { data, error } = await supabase
    .from('tracker_tool_assignments')
    .select('serial, mount_type, attached_at')
    .eq('tool_id', toolId)
    .is('detached_at', null)
    .maybeSingle();
  if (error) {
    console.error('Error fetching tool tracker:', error);
    return null;
  }
  if (!data) return null;

  // Resolve the friendly per-company number for this serial.
  let companyNumber: number | null = null;
  const { data: numRow } = await supabase
    .from('tracker_company_assignments')
    .select('company_number')
    .eq('serial', data.serial)
    .is('released_at', null)
    .maybeSingle();
  companyNumber = numRow?.company_number ?? null;

  return { ...(data as any), company_number: companyNumber } as ToolTracker;
}

/** Denormalized current location for a tool (fast read; null lat/lng = no fix yet). */
export async function fetchToolLocation(toolId: string): Promise<ToolLocation | null> {
  const { data, error } = await supabase
    .from('tools')
    .select(
      'last_latitude, last_longitude, last_location_recorded_at, last_location_updated_at, last_location_serial, last_battery'
    )
    .eq('id', toolId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('Error fetching tool location:', error);
    return null;
  }
  return {
    latitude: data.last_latitude,
    longitude: data.last_longitude,
    recorded_at: data.last_location_recorded_at,
    updated_at: data.last_location_updated_at,
    serial: data.last_location_serial,
    battery: data.last_battery ?? null,
  };
}

export async function attachTracker(
  serial: string,
  toolId: string,
  mountType: MountType
): Promise<void> {
  const { error } = await supabase.rpc('attach_tracker_to_tool', {
    p_serial: serial,
    p_tool_id: toolId,
    p_mount_type: mountType,
  });
  if (error) throw error;
}

export async function detachTracker(toolId: string): Promise<void> {
  const { error } = await supabase.rpc('detach_tracker_from_tool', { p_tool_id: toolId });
  if (error) throw error;
}
