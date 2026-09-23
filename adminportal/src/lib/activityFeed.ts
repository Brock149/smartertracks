import { supabase } from './supabaseClient'
import type { CompanyEvent } from './companyEvents'

export type ActivityTransaction = {
  id: string
  tool_id: string | null
  from_user_id: string | null
  to_user_id: string
  location: string
  stored_at: string
  notes: string | null
  attribution?: string | null
  timestamp: string
  created_at: string
  deleted_from_user_name?: string | null
  deleted_to_user_name?: string | null
  deleted_tool_number?: string | null
  deleted_tool_name?: string | null
  tool?: {
    number: string
    name: string
  }
  from_user?: {
    name: string
  }
  to_user?: {
    name: string
  }
}

export type ActivityFeedItem =
  | { kind: 'tx'; id: string; ts: string; tx: ActivityTransaction }
  | { kind: 'event'; id: string; ts: string; ev: CompanyEvent }

type FeedPayload = {
  total?: number | string
  rows?: FeedRow[]
}

type FeedRow = {
  kind: 'tx' | 'event'
  item_id: string
  ts: string
  tool_id?: string | null
  tool_number?: string | null
  tool_name?: string | null
  from_user_name?: string | null
  to_user_name?: string | null
  location?: string | null
  stored_at?: string | null
  notes?: string | null
  attribution?: string | null
  deleted_from_user_name?: string | null
  deleted_to_user_name?: string | null
  deleted_tool_number?: string | null
  deleted_tool_name?: string | null
  event_type?: string | null
  actor_name?: string | null
  target_label?: string | null
  details?: string | null
}

type TxRow = {
  id: string
  tool_id: string | null
  from_user_id: string | null
  to_user_id: string | null
  location: string | null
  stored_at: string | null
  notes: string | null
  attribution?: string | null
  timestamp: string
  created_at: string
  deleted_from_user_name?: string | null
  deleted_to_user_name?: string | null
  deleted_tool_number?: string | null
  deleted_tool_name?: string | null
  tool?: { number: string; name: string } | { number: string; name: string }[] | null
  from_user?: { name: string } | { name: string }[] | null
  to_user?: { name: string } | { name: string }[] | null
}

const TX_SELECT = `
  id, tool_id, from_user_id, to_user_id, location, stored_at, notes, attribution,
  timestamp, created_at, deleted_from_user_name, deleted_to_user_name,
  deleted_tool_number, deleted_tool_name,
  tool:tools(number, name),
  from_user:users!from_user_id(name),
  to_user:users!to_user_id(name)
`

const TX_TEXT_COLUMNS = [
  'location',
  'stored_at',
  'notes',
  'attribution',
  'deleted_from_user_name',
  'deleted_to_user_name',
  'deleted_tool_number',
  'deleted_tool_name',
] as const

// PostgREST max_rows. A fallback search that hits this on any branch can miss
// older matches; list_admin_activity_feed does not have that ceiling.
const FALLBACK_CAP = 1000
const ID_CHUNK = 80

let rpcAvailable: boolean | null = null

export async function fetchActivityFeed(params: {
  query: string
  page: number
  pageSize: number
}): Promise<{ items: ActivityFeedItem[]; total: number }> {
  const query = params.query.trim()
  const page = Math.max(params.page, 1)
  const pageSize = params.pageSize
  const offset = (page - 1) * pageSize

  const viaRpc = await fetchViaRpc(query, pageSize, offset)
  if (viaRpc) {
    return {
      total: viaRpc.total,
      items: (viaRpc.rows || []).map(rowToFeedItem),
    }
  }

  if (query) return fetchSearchFallback(query, page, pageSize)
  return fetchRecentFallback(page, pageSize)
}

async function fetchViaRpc(
  query: string,
  limit: number,
  offset: number
): Promise<{ total: number; rows: FeedRow[] } | null> {
  if (rpcAvailable === false) return null

  const { data, error } = await supabase.rpc('list_admin_activity_feed', {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    if (isMissingRpc(error)) {
      rpcAvailable = false
      return null
    }
    throw new Error(error.message)
  }

  rpcAvailable = true
  const payload = (typeof data === 'string' ? JSON.parse(data) : data) as FeedPayload | null
  const total = Number(payload?.total ?? 0)
  return {
    total: Number.isFinite(total) ? total : 0,
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
  }
}

function isMissingRpc(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202') return true
  const message = error.message || ''
  return /could not find the function/i.test(message) || /schema cache/i.test(message)
}

function rowToFeedItem(row: FeedRow): ActivityFeedItem {
  if (row.kind === 'event') {
    const ev: CompanyEvent = {
      id: row.item_id,
      company_id: '',
      event_type: row.event_type || '',
      actor_id: null,
      actor_name: row.actor_name ?? null,
      target_type: null,
      target_id: null,
      target_label: row.target_label ?? null,
      details: row.details ?? null,
      created_at: row.ts,
    }
    return { kind: 'event', id: `ev-${row.item_id}`, ts: row.ts, ev }
  }

  const tx: ActivityTransaction = {
    id: row.item_id,
    tool_id: row.tool_id ?? null,
    from_user_id: null,
    to_user_id: '',
    location: row.location || '',
    stored_at: row.stored_at || '',
    notes: row.notes ?? null,
    attribution: row.attribution ?? null,
    timestamp: row.ts,
    created_at: row.ts,
    deleted_from_user_name: row.deleted_from_user_name ?? null,
    deleted_to_user_name: row.deleted_to_user_name ?? null,
    deleted_tool_number: row.deleted_tool_number ?? null,
    deleted_tool_name: row.deleted_tool_name ?? null,
    tool: row.tool_number || row.tool_name
      ? { number: row.tool_number || '', name: row.tool_name || '' }
      : undefined,
    from_user: row.from_user_name ? { name: row.from_user_name } : undefined,
    to_user: row.to_user_name ? { name: row.to_user_name } : undefined,
  }
  return { kind: 'tx', id: `tx-${row.item_id}`, ts: row.ts, tx }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function txRowToItem(row: TxRow): ActivityFeedItem {
  const tool = one(row.tool)
  const fromUser = one(row.from_user)
  const toUser = one(row.to_user)
  const ts = row.timestamp || row.created_at
  return {
    kind: 'tx',
    id: `tx-${row.id}`,
    ts,
    tx: {
      id: row.id,
      tool_id: row.tool_id,
      from_user_id: row.from_user_id,
      to_user_id: row.to_user_id || '',
      location: row.location || '',
      stored_at: row.stored_at || '',
      notes: row.notes,
      attribution: row.attribution,
      timestamp: ts,
      created_at: row.created_at,
      deleted_from_user_name: row.deleted_from_user_name,
      deleted_to_user_name: row.deleted_to_user_name,
      deleted_tool_number: row.deleted_tool_number,
      deleted_tool_name: row.deleted_tool_name,
      tool: tool ? { number: tool.number, name: tool.name } : undefined,
      from_user: fromUser?.name ? { name: fromUser.name } : undefined,
      to_user: toUser?.name ? { name: toUser.name } : undefined,
    },
  }
}

function eventRowToItem(row: CompanyEvent): ActivityFeedItem {
  return { kind: 'event', id: `ev-${row.id}`, ts: row.created_at, ev: row }
}

function byNewest(a: ActivityFeedItem, b: ActivityFeedItem): number {
  const delta = new Date(b.ts).getTime() - new Date(a.ts).getTime()
  if (delta !== 0) return delta
  return b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function fetchRecentFallback(page: number, pageSize: number): Promise<{ items: ActivityFeedItem[]; total: number }> {
  const need = page * pageSize
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const [txCountRes, evCountRes] = await Promise.all([
    supabase.from('tool_transactions').select('id', { count: 'exact', head: true }),
    supabase.from('company_events').select('id', { count: 'exact', head: true }),
  ])
  if (txCountRes.error) throw new Error(txCountRes.error.message)
  if (evCountRes.error) console.warn('company_events count failed (continuing):', evCountRes.error.message)
  const total = (txCountRes.count ?? 0) + (evCountRes.error ? 0 : evCountRes.count ?? 0)

  // The newest `need` rows of each stream are enough to build a correct merged
  // page, until that window passes the API row cap.
  if (need <= FALLBACK_CAP) {
    const [txRes, evRes] = await Promise.all([
      supabase.from('tool_transactions').select(TX_SELECT).order('timestamp', { ascending: false }).range(0, need - 1),
      supabase.from('company_events').select('*').order('created_at', { ascending: false }).range(0, need - 1),
    ])
    if (txRes.error) throw new Error(txRes.error.message)
    if (evRes.error) console.warn('company_events fetch failed (continuing):', evRes.error.message)
    const merged = [
      ...((txRes.data || []) as TxRow[]).map(txRowToItem),
      ...((evRes.error ? [] : evRes.data || []) as CompanyEvent[]).map(eventRowToItem),
    ].sort(byNewest)
    return { total, items: merged.slice(from, from + pageSize) }
  }

  const [txRes, evRes] = await Promise.all([
    supabase.from('tool_transactions').select(TX_SELECT).order('timestamp', { ascending: false }).range(from, to),
    supabase.from('company_events').select('*').order('created_at', { ascending: false }).range(from, to),
  ])
  if (txRes.error) throw new Error(txRes.error.message)
  if (evRes.error) console.warn('company_events fetch failed (continuing):', evRes.error.message)
  const merged = [
    ...((txRes.data || []) as TxRow[]).map(txRowToItem),
    ...((evRes.error ? [] : evRes.data || []) as CompanyEvent[]).map(eventRowToItem),
  ].sort(byNewest)
  return { total, items: merged.slice(0, pageSize) }
}

async function fetchSearchFallback(
  term: string,
  page: number,
  pageSize: number
): Promise<{ items: ActivityFeedItem[]; total: number }> {
  const like = `%${term.replace(/[%_]/g, '')}%`
  const [nameTools, numberTools, users] = await Promise.all([
    supabase.from('tools').select('id').ilike('name', like).limit(FALLBACK_CAP),
    supabase.from('tools').select('id').ilike('number', like).limit(FALLBACK_CAP),
    supabase.from('users').select('id').ilike('name', like).limit(FALLBACK_CAP),
  ])
  if (nameTools.error) throw new Error(nameTools.error.message)
  if (numberTools.error) throw new Error(numberTools.error.message)
  if (users.error) throw new Error(users.error.message)

  const toolIds = [...new Set([...(nameTools.data || []), ...(numberTools.data || [])].map((row) => row.id as string))]
  const userIds = [...new Set((users.data || []).map((row) => row.id as string))]

  const txQueries = [
    ...TX_TEXT_COLUMNS.map((column) =>
      supabase.from('tool_transactions').select(TX_SELECT).ilike(column, like).order('timestamp', { ascending: false }).limit(FALLBACK_CAP)
    ),
    ...chunk(toolIds, ID_CHUNK).map((ids) =>
      supabase.from('tool_transactions').select(TX_SELECT).in('tool_id', ids).order('timestamp', { ascending: false }).limit(FALLBACK_CAP)
    ),
    ...chunk(userIds, ID_CHUNK).map((ids) =>
      supabase.from('tool_transactions').select(TX_SELECT).in('from_user_id', ids).order('timestamp', { ascending: false }).limit(FALLBACK_CAP)
    ),
    ...chunk(userIds, ID_CHUNK).map((ids) =>
      supabase.from('tool_transactions').select(TX_SELECT).in('to_user_id', ids).order('timestamp', { ascending: false }).limit(FALLBACK_CAP)
    ),
  ]

  const eventQueries = (['actor_name', 'target_label', 'details'] as const).map((column) =>
    supabase.from('company_events').select('*').ilike(column, like).order('created_at', { ascending: false }).limit(FALLBACK_CAP)
  )

  const [txResults, eventResults] = await Promise.all([
    Promise.all(txQueries),
    Promise.all(eventQueries),
  ])

  const txById = new Map<string, TxRow>()
  for (const result of txResults) {
    if (result.error) throw new Error(result.error.message)
    for (const row of (result.data || []) as TxRow[]) txById.set(row.id, row)
  }

  const eventsById = new Map<string, CompanyEvent>()
  for (const result of eventResults) {
    if (result.error) {
      console.warn('company_events search failed (continuing):', result.error.message)
      continue
    }
    for (const row of (result.data || []) as CompanyEvent[]) eventsById.set(row.id, row)
  }

  const merged = [
    ...[...txById.values()].map(txRowToItem),
    ...[...eventsById.values()].map(eventRowToItem),
  ].sort(byNewest)

  const from = (page - 1) * pageSize
  return { total: merged.length, items: merged.slice(from, from + pageSize) }
}
