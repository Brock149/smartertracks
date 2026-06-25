import { supabase } from './supabaseClient'

export interface CompanyEvent {
  id: string
  company_id: string
  event_type: string
  actor_id: string | null
  actor_name: string | null
  target_type: string | null
  target_id: string | null
  target_label: string | null
  details: string | null
  created_at: string
}

// Records a company activity event from the admin portal (e.g. a tool deletion
// triggered via RPC, which can't log the event itself). Best-effort: never
// throws, so it can't block the action that triggered it.
export async function logCompanyEvent(params: {
  event_type: string
  target_type?: string | null
  target_id?: string | null
  target_label?: string | null
  details?: string | null
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: me } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('id', user.id)
      .single()

    if (!me?.company_id) return

    await supabase.from('company_events').insert({
      company_id: me.company_id,
      event_type: params.event_type,
      actor_id: user.id,
      actor_name: me.name || user.email || 'An admin',
      target_type: params.target_type ?? null,
      target_id: params.target_id ?? null,
      target_label: params.target_label ?? null,
      details: params.details ?? null,
    })
  } catch (e) {
    console.warn('logCompanyEvent failed (continuing):', e)
  }
}

// Fetches the company activity feed. RLS limits this to the caller's company.
export async function fetchCompanyEvents(): Promise<CompanyEvent[]> {
  const { data, error } = await supabase
    .from('company_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Table may not exist yet — degrade gracefully.
    console.warn('fetchCompanyEvents failed (continuing):', error.message)
    return []
  }
  return (data || []) as CompanyEvent[]
}
