import { supabase } from './supabaseClient'

export const STORED_AT_OPTIONS = ['On Truck', 'On Job Site', 'N/A'] as const

export type FlaggedChecklistItem = {
  id: string
  item_name: string
  status: 'damaged' | 'needs_replacement'
  comments?: string
}

type PossessionStart = {
  timestamp: string
  ownerName: string | null
}

function formatPossessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isNonPossessionTransaction(tx: {
  from_user_id: string | null
  to_user_id: string | null
  attribution?: string | null
}): boolean {
  const attr = (tx.attribution || '').trim().toLowerCase()
  if (attr.startsWith('tracker attached') || attr.startsWith('tracker detached')) {
    return true
  }
  return tx.from_user_id === tx.to_user_id
}

export async function resolveActorLine(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in')

  let name = (user.user_metadata?.name as string | undefined)?.trim() || ''
  if (!name) {
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()
    name = (profile?.name || '').trim()
  }
  const email = user.email || 'no email'
  return name ? `${name} (${email})` : email
}

export async function fetchLiveTool(toolId: string): Promise<{
  id: string
  number: string
  name: string
  company_id: string
  current_owner: string | null
  owner_name: string | null
}> {
  const { data, error } = await supabase
    .from('tools')
    .select('id, number, name, company_id, current_owner')
    .eq('id', toolId)
    .single()

  if (error || !data) throw error || new Error('Tool not found')

  let ownerName: string | null = null
  if (data.current_owner) {
    const { data: ownerRow } = await supabase
      .from('users')
      .select('name')
      .eq('id', data.current_owner)
      .single()
    ownerName = ownerRow?.name ?? null
  }

  return {
    id: data.id,
    number: data.number,
    name: data.name,
    company_id: data.company_id,
    current_owner: data.current_owner ?? null,
    owner_name: ownerName,
  }
}

export async function fetchLatestCustody(toolId: string): Promise<{
  location: string
  stored_at: string
}> {
  const { data, error } = await supabase
    .from('tool_transactions')
    .select('location, stored_at')
    .eq('tool_id', toolId)
    .order('timestamp', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  return {
    location: row?.location || '',
    stored_at: row?.stored_at || '',
  }
}

async function fetchPossessionStart(
  toolId: string,
  ownerId: string | null
): Promise<PossessionStart | null> {
  if (!ownerId) return null

  const { data, error } = await supabase
    .from('tool_transactions')
    .select(`
      timestamp,
      from_user_id,
      to_user_id,
      attribution,
      deleted_to_user_name,
      to_user:users!tool_transactions_to_user_id_fkey(name)
    `)
    .eq('tool_id', toolId)
    .order('timestamp', { ascending: false })

  if (error) throw error

  const possession = (data || []).find((tx: any) => {
    if (isNonPossessionTransaction(tx)) return false
    return tx.to_user_id === ownerId
  })

  if (!possession) return null

  const ownerName = possession.deleted_to_user_name
    ? `${possession.deleted_to_user_name} (removed)`
    : (possession.to_user as any)?.name || null

  return { timestamp: possession.timestamp, ownerName }
}

function possessionLine(
  kind: 'damage-report' | 'location-update',
  ownerName: string | null,
  possession: PossessionStart | null,
  ownerId: string | null
): string {
  if (!ownerId) return 'Tool currently unassigned'
  const sinceName = ownerName || possession?.ownerName || 'current owner'
  if (possession) {
    const since = formatPossessionDate(possession.timestamp)
    if (kind === 'damage-report') return `Held by ${sinceName} since ${since}`
    return `In possession since ${since}`
  }
  if (kind === 'damage-report') return `Held by ${sinceName}`
  return ''
}

function damageSummary(items: FlaggedChecklistItem[]): string {
  if (items.length === 0) return ''
  const parts = items.map(
    (item) =>
      `${item.item_name} – ${item.status === 'damaged' ? 'Needs Repair' : 'Needs Replacement'}`
  )
  return `${parts.join('; ')} reported`
}

async function normalizeLocation(companyId: string, location: string): Promise<string> {
  const { data, error } = await supabase.rpc('normalize_location', {
    p_company_id: companyId,
    p_input_location: location,
  })
  if (error) {
    console.error('Error normalizing location:', error)
    return location
  }
  return data || location
}

export async function submitDamageReport(params: {
  toolId: string
  flaggedItems: FlaggedChecklistItem[]
  notes?: string
}): Promise<void> {
  if (params.flaggedItems.length === 0) {
    throw new Error('Check at least one item that needs repair or replacement')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in')

  const tool = await fetchLiveTool(params.toolId)
  const latest = await fetchLatestCustody(params.toolId)
  const actor = await resolveActorLine()
  const possession = await fetchPossessionStart(params.toolId, tool.current_owner)

  const fromUserId = tool.current_owner || user.id
  const toUserId = tool.current_owner || user.id

  const originalLocation = latest.location || 'Current Location'
  const finalLocation = tool.company_id
    ? await normalizeLocation(tool.company_id, originalLocation)
    : originalLocation

  const heldLine = possessionLine('damage-report', tool.owner_name, possession, tool.current_owner)
  const baseLine = `Damage reported by ${actor} — possession unchanged`
  const summary = damageSummary(params.flaggedItems)
  const attribution = [baseLine, heldLine, summary].filter(Boolean).join('\n')
  const overallNotes = (params.notes || '').trim()

  const { data: transaction, error: txError } = await supabase
    .from('tool_transactions')
    .insert({
      tool_id: tool.id,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      location: finalLocation,
      stored_at: latest.stored_at || 'N/A',
      notes: overallNotes,
      attribution,
      company_id: tool.company_id,
    })
    .select('id')
    .single()

  if (txError || !transaction) throw txError || new Error('Failed to create report')

  const { error: reportError } = await supabase.from('checklist_reports').insert(
    params.flaggedItems.map((item) => ({
      transaction_id: transaction.id,
      checklist_item_id: item.id,
      status: item.status === 'damaged' ? 'Damaged/Needs Repair' : 'Needs Replacement/Resupply',
      comments: item.comments?.trim() || overallNotes || '',
      company_id: tool.company_id,
    }))
  )

  if (reportError) throw reportError
}

export async function submitLocationUpdate(params: {
  toolId: string
  location: string
  storedAt: string
  notes?: string
}): Promise<void> {
  const newLocation = params.location.trim()
  const newStoredAt = params.storedAt.trim()
  if (!newLocation || !newStoredAt) {
    throw new Error('Enter a location and select where the tool is stored')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in')

  const tool = await fetchLiveTool(params.toolId)
  const latest = await fetchLatestCustody(params.toolId)
  const oldLocation = (latest.location || '').trim()
  const oldStoredAt = (latest.stored_at || '').trim()

  const finalLocation = tool.company_id
    ? await normalizeLocation(tool.company_id, newLocation)
    : newLocation

  const locChanged = finalLocation !== oldLocation
  const storedChanged = newStoredAt !== oldStoredAt
  if (!locChanged && !storedChanged) {
    throw new Error('Update the location or stored-at value before saving')
  }

  const actor = await resolveActorLine()
  const possession = await fetchPossessionStart(params.toolId, tool.current_owner)
  const heldLine = possessionLine('location-update', tool.owner_name, possession, tool.current_owner)

  const changeBits: string[] = []
  if (locChanged) changeBits.push(`Location: ${oldLocation || '—'} → ${finalLocation}`)
  if (storedChanged) changeBits.push(`Stored: ${oldStoredAt || '—'} → ${newStoredAt}`)

  const attribution = [
    `Location updated by ${actor} — possession unchanged`,
    heldLine,
    changeBits.join('; '),
  ]
    .filter(Boolean)
    .join('\n')

  const fromUserId = tool.current_owner || user.id
  const toUserId = tool.current_owner || user.id

  const { error } = await supabase.from('tool_transactions').insert({
    tool_id: tool.id,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    location: finalLocation,
    stored_at: newStoredAt,
    notes: (params.notes || '').trim(),
    attribution,
    company_id: tool.company_id,
  })

  if (error) throw error
}
