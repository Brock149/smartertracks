import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
// After you verify your domain in Resend, set EXPORT_FROM_EMAIL to something like
// "SmarterTracks Reports <reports@smartertracks.com>". Until then it falls back to
// Resend's sandbox sender, which can only deliver to your own Resend account email.
const EXPORT_FROM_EMAIL =
  Deno.env.get('EXPORT_FROM_EMAIL') ?? 'SmarterTracks Reports <onboarding@resend.dev>'
const EXPORT_REPLY_TO = Deno.env.get('EXPORT_REPLY_TO') ?? 'brockcoburn@smartertracks.com'

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type ExportType = 'personal' | 'company'

interface CompanyRow {
  company_id: string
  auto_export_enabled: boolean
  auto_export_frequency: string
  auto_export_recipients: string[] | null
  auto_export_last_sent_at: string | null
  company_export_enabled: boolean
  company_export_frequency: string
  company_export_recipients: string[] | null
  company_export_last_sent_at: string | null
}

const COMPANY_FIELDS =
  'company_id, auto_export_enabled, auto_export_frequency, auto_export_recipients, auto_export_last_sent_at, ' +
  'company_export_enabled, company_export_frequency, company_export_recipients, company_export_last_sent_at'

interface PersonalToolRow {
  id: string
  owner_id: string
  number: string | null
  number_numeric: number | null
  name: string
  photo_url: string | null
  holder_type: string
  lent_to_name: string | null
  lent_location: string | null
  created_at: string
  images?: { image_url: string; is_primary: boolean; uploaded_at: string }[]
}

interface CompanyToolRow {
  id: string
  number: string | null
  number_numeric: number | null
  name: string
  description: string | null
  current_owner: string | null
  deleted_owner_name: string | null
  estimated_cost: number | null
  photo_url: string | null
  created_at: string
  images?: { image_url: string; is_primary: boolean; uploaded_at: string }[]
}

type CellValue = string | number

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Weekly = Mondays, Monthly = the 1st (UTC). Guard against double-sends per day. */
function isDue(frequency: string, lastSentAt: string | null, now: Date): boolean {
  const today = now.toISOString().slice(0, 10)
  if (lastSentAt && new Date(lastSentAt).toISOString().slice(0, 10) === today) {
    return false
  }
  if (frequency === 'monthly') {
    return now.getUTCDate() === 1
  }
  return now.getUTCDay() === 1
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Photo URLs for a tool, primary first, falling back to the legacy photo_url. */
function photoArray(
  images: { image_url: string; is_primary: boolean }[] | undefined,
  fallback: string | null
): string[] {
  const sorted = (images || [])
    .slice()
    .sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1))
    .map((i) => i.image_url)
  if (sorted.length === 0 && fallback) sorted.push(fallback)
  return sorted
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Build a real .xlsx (base64) with AutoFilter enabled so recipients get the
 * native Excel sort/filter dropdowns out of the box. Photo columns are written
 * as clickable hyperlinks; currency columns get a $ number format.
 */
function buildXlsxBase64(opts: {
  sheetName: string
  header: string[]
  rows: CellValue[][]
  colWidths: number[]
  photoColStart: number
  currencyCols?: number[]
}): string {
  const aoa: CellValue[][] = [opts.header, ...opts.rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Sort/filter controls across the whole used range.
  const ref = ws['!ref']
  if (ref) ws['!autofilter'] = { ref }
  ws['!cols'] = opts.colWidths.map((w) => ({ wch: w }))

  // Make photo cells clickable links.
  for (let r = 0; r < opts.rows.length; r++) {
    const row = opts.rows[r]
    for (let c = opts.photoColStart; c < opts.header.length; c++) {
      const val = row[c]
      if (typeof val === 'string' && val.startsWith('http')) {
        const addr = XLSX.utils.encode_cell({ r: r + 1, c })
        ws[addr] = { t: 's', v: val, l: { Target: val, Tooltip: 'Open photo' } }
      }
    }
  }

  // Currency formatting for numeric cost cells.
  for (const cc of opts.currencyCols || []) {
    for (let r = 0; r < opts.rows.length; r++) {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c: cc })
      const cell = ws[addr]
      if (cell && typeof cell.v === 'number') cell.z = '$#,##0'
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName)
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string
}

/** Pad photo URLs into a fixed number of trailing cells. */
function padPhotos(photos: string[], count: number): string[] {
  const out = photos.slice(0, count)
  while (out.length < count) out.push('')
  return out
}

async function getActiveCompanyName(
  admin: ReturnType<typeof createClient>,
  companyId: string
): Promise<string | null> {
  const { data } = await admin
    .from('companies')
    .select('name, is_active')
    .eq('id', companyId)
    .single()
  if (!data || (data as { is_active: boolean }).is_active === false) return null
  return (data as { name: string }).name || 'Company'
}

async function sendReport(opts: {
  recipients: string[]
  subject: string
  html: string
  filename: string
  contentBase64: string
}): Promise<{ ok: boolean; detail?: string }> {
  const payload: Record<string, unknown> = {
    from: EXPORT_FROM_EMAIL,
    to: opts.recipients,
    subject: opts.subject,
    html: opts.html,
    attachments: [
      { filename: opts.filename, content: opts.contentBase64, content_type: XLSX_CONTENT_TYPE },
    ],
  }
  if (EXPORT_REPLY_TO) payload.reply_to = EXPORT_REPLY_TO

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const detail = await res.text()
    return { ok: false, detail: detail.slice(0, 300) }
  }
  return { ok: true }
}

// ---- Personal tools report ------------------------------------------------

async function exportPersonal(
  admin: ReturnType<typeof createClient>,
  company: CompanyRow
): Promise<{ company_id: string; type: ExportType; status: string; detail?: string }> {
  const recipients = (company.auto_export_recipients || []).map((r) => (r || '').trim()).filter(Boolean)
  if (recipients.length === 0) {
    return { company_id: company.company_id, type: 'personal', status: 'skipped', detail: 'no recipients configured' }
  }
  const companyName = await getActiveCompanyName(admin, company.company_id)
  if (!companyName) {
    return { company_id: company.company_id, type: 'personal', status: 'skipped', detail: 'company inactive' }
  }

  const { data: userRows, error: usersError } = await admin
    .from('users')
    .select('id, name, email')
    .eq('company_id', company.company_id)
  if (usersError) {
    return { company_id: company.company_id, type: 'personal', status: 'error', detail: usersError.message }
  }

  const owners = new Map<string, { name: string; email: string }>()
  for (const u of (userRows || []) as { id: string; name: string; email: string }[]) {
    owners.set(u.id, { name: u.name || u.email || 'Unknown', email: u.email || '' })
  }
  const ownerIds = [...owners.keys()]

  let tools: PersonalToolRow[] = []
  if (ownerIds.length > 0) {
    const { data: toolRows, error: toolsError } = await admin
      .from('personal_tools')
      .select(
        'id, owner_id, number, number_numeric, name, photo_url, holder_type, lent_to_name, lent_location, created_at, images:personal_tool_images(image_url, is_primary, uploaded_at)'
      )
      .in('owner_id', ownerIds)
      .eq('is_deleted', false)
    if (toolsError) {
      return { company_id: company.company_id, type: 'personal', status: 'error', detail: toolsError.message }
    }
    tools = (toolRows || []) as PersonalToolRow[]
  }

  const sorted = [...tools].sort((a, b) => {
    const an = owners.get(a.owner_id)?.name || ''
    const bn = owners.get(b.owner_id)?.name || ''
    if (an !== bn) return an.localeCompare(bn)
    return (a.number_numeric ?? 0) - (b.number_numeric ?? 0)
  })

  const photoCount = Math.max(1, ...sorted.map((t) => photoArray(t.images, t.photo_url).length))
  const fixed = ['Employee', 'Email', 'Tool #', 'Tool Name', 'Status', 'Lent To', 'Location', 'Date Added']
  const header = [...fixed, ...Array.from({ length: photoCount }, (_, i) => `Photo ${i + 1}`)]

  const rows: CellValue[][] = sorted.map((tool) => {
    const owner = owners.get(tool.owner_id)
    const isLent = tool.holder_type === 'lent'
    return [
      owner?.name || 'Unknown',
      owner?.email || '',
      tool.number ?? '',
      tool.name,
      isLent ? 'Lent out' : 'In possession',
      isLent ? tool.lent_to_name || '' : '',
      isLent ? tool.lent_location || '' : '',
      tool.created_at ? new Date(tool.created_at).toISOString().slice(0, 10) : '',
      ...padPhotos(photoArray(tool.images, tool.photo_url), photoCount),
    ]
  })

  const colWidths = [22, 26, 8, 28, 16, 22, 22, 12, ...Array(photoCount).fill(44)]
  const dateLabel = new Date().toISOString().slice(0, 10)
  const filename = `personal-tool-inventory-${slugify(companyName) || 'company'}-${dateLabel}.xlsx`
  const contentBase64 = buildXlsxBase64({
    sheetName: 'Personal Tools',
    header,
    rows,
    colWidths,
    photoColStart: fixed.length,
  })

  const totalTools = tools.length
  const lentCount = tools.filter((t) => t.holder_type === 'lent').length
  const employeesWithTools = new Set(tools.map((t) => t.owner_id)).size
  const html = `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1f2937;">
      <h2 style="margin:0 0 6px;">Personal Tool Inventory</h2>
      <p style="margin:0 0 2px;color:#6b7280;">${escapeHtml(companyName)}</p>
      <p style="margin:0 0 16px;color:#6b7280;">As of ${escapeHtml(dateLabel)}</p>
      <p style="margin:0 0 12px;">
        <strong>${totalTools}</strong> tool${totalTools !== 1 ? 's' : ''} across
        <strong>${employeesWithTools}</strong> employee${employeesWithTools !== 1 ? 's' : ''}${
    lentCount > 0 ? ` &middot; <strong>${lentCount}</strong> currently lent out` : ''
  }.
      </p>
      <p style="margin:0 0 12px;">The full itemized list is attached as an Excel spreadsheet (.xlsx) with built-in sort &amp; filter. Each photo has its own column with a clickable link.</p>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Automated inventory report generated by SmarterTracks.</p>
    </div>`

  const sent = await sendReport({
    recipients,
    subject: `Personal Tool Inventory — ${companyName} — ${dateLabel}`,
    html,
    filename,
    contentBase64,
  })
  if (!sent.ok) {
    return { company_id: company.company_id, type: 'personal', status: 'error', detail: sent.detail }
  }
  return { company_id: company.company_id, type: 'personal', status: 'sent', detail: `${totalTools} tools` }
}

// ---- Company tools report -------------------------------------------------

function ownerLabel(tool: CompanyToolRow, owners: Map<string, { name: string }>): string {
  if (tool.current_owner && owners.has(tool.current_owner)) {
    return owners.get(tool.current_owner)!.name
  }
  if (tool.deleted_owner_name) return `${tool.deleted_owner_name} (removed)`
  return 'Unassigned'
}

async function exportCompanyTools(
  admin: ReturnType<typeof createClient>,
  company: CompanyRow
): Promise<{ company_id: string; type: ExportType; status: string; detail?: string }> {
  const recipients = (company.company_export_recipients || []).map((r) => (r || '').trim()).filter(Boolean)
  if (recipients.length === 0) {
    return { company_id: company.company_id, type: 'company', status: 'skipped', detail: 'no recipients configured' }
  }
  const companyName = await getActiveCompanyName(admin, company.company_id)
  if (!companyName) {
    return { company_id: company.company_id, type: 'company', status: 'skipped', detail: 'company inactive' }
  }

  const { data: userRows, error: usersError } = await admin
    .from('users')
    .select('id, name')
    .eq('company_id', company.company_id)
  if (usersError) {
    return { company_id: company.company_id, type: 'company', status: 'error', detail: usersError.message }
  }
  const owners = new Map<string, { name: string }>()
  for (const u of (userRows || []) as { id: string; name: string }[]) {
    owners.set(u.id, { name: u.name || 'Unknown' })
  }

  const { data: toolRows, error: toolsError } = await admin
    .from('tools')
    .select(
      'id, number, number_numeric, name, description, current_owner, deleted_owner_name, estimated_cost, photo_url, created_at, images:tool_images(image_url, is_primary, uploaded_at)'
    )
    .eq('company_id', company.company_id)
    .eq('is_deleted', false)
  if (toolsError) {
    return { company_id: company.company_id, type: 'company', status: 'error', detail: toolsError.message }
  }
  const tools = (toolRows || []) as CompanyToolRow[]

  // Latest transaction per tool gives current location + stored_at.
  const { data: txRows, error: txError } = await admin
    .from('tool_transactions')
    .select('tool_id, location, stored_at, timestamp')
    .eq('company_id', company.company_id)
    .order('timestamp', { ascending: false })
  if (txError) {
    return { company_id: company.company_id, type: 'company', status: 'error', detail: txError.message }
  }
  const locByTool = new Map<string, { location: string; stored_at: string }>()
  for (const tx of (txRows || []) as { tool_id: string; location: string; stored_at: string }[]) {
    if (tx.tool_id && !locByTool.has(tx.tool_id)) {
      locByTool.set(tx.tool_id, { location: tx.location || '', stored_at: tx.stored_at || '' })
    }
  }

  const sorted = [...tools].sort((a, b) => {
    const al = (locByTool.get(a.id)?.location || '').trim()
    const bl = (locByTool.get(b.id)?.location || '').trim()
    if (!al && bl) return 1
    if (al && !bl) return -1
    const byLoc = al.toLowerCase().localeCompare(bl.toLowerCase())
    if (byLoc !== 0) return byLoc
    return (a.number_numeric ?? 999999) - (b.number_numeric ?? 999999)
  })

  const photoCount = Math.max(1, ...sorted.map((t) => photoArray(t.images, t.photo_url).length))
  const fixed = ['Location', 'Stored At', 'Tool #', 'Tool Name', 'Description', 'Current Owner', 'Est. Cost', 'Date Added']
  const header = [...fixed, ...Array.from({ length: photoCount }, (_, i) => `Photo ${i + 1}`)]

  const rows: CellValue[][] = sorted.map((tool) => {
    const loc = locByTool.get(tool.id)
    return [
      loc?.location || 'No Location',
      loc?.stored_at || '',
      tool.number ?? '',
      tool.name,
      tool.description || '',
      ownerLabel(tool, owners),
      tool.estimated_cost != null ? tool.estimated_cost : '',
      tool.created_at ? new Date(tool.created_at).toISOString().slice(0, 10) : '',
      ...padPhotos(photoArray(tool.images, tool.photo_url), photoCount),
    ]
  })

  const colWidths = [22, 18, 8, 28, 36, 22, 10, 12, ...Array(photoCount).fill(44)]
  const dateLabel = new Date().toISOString().slice(0, 10)
  const filename = `company-tool-inventory-${slugify(companyName) || 'company'}-${dateLabel}.xlsx`
  const contentBase64 = buildXlsxBase64({
    sheetName: 'Company Tools',
    header,
    rows,
    colWidths,
    photoColStart: fixed.length,
    currencyCols: [6],
  })

  const totalTools = tools.length
  const locationCount = new Set(
    tools.map((t) => (locByTool.get(t.id)?.location || 'No Location').trim().toLowerCase())
  ).size
  const totalValue = tools.reduce((sum, t) => sum + (t.estimated_cost || 0), 0)
  const unassigned = tools.filter((t) => !t.current_owner).length
  const html = `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1f2937;">
      <h2 style="margin:0 0 6px;">Company Tool Inventory</h2>
      <p style="margin:0 0 2px;color:#6b7280;">${escapeHtml(companyName)}</p>
      <p style="margin:0 0 16px;color:#6b7280;">As of ${escapeHtml(dateLabel)}</p>
      <p style="margin:0 0 12px;">
        <strong>${totalTools}</strong> tool${totalTools !== 1 ? 's' : ''} across
        <strong>${locationCount}</strong> location${locationCount !== 1 ? 's' : ''}${
    totalValue > 0 ? ` &middot; est. value <strong>$${totalValue.toLocaleString()}</strong>` : ''
  }${unassigned > 0 ? ` &middot; <strong>${unassigned}</strong> unassigned` : ''}.
      </p>
      <p style="margin:0 0 12px;">The full itemized list is attached as an Excel spreadsheet (.xlsx), sorted by location, with built-in sort &amp; filter. Each photo has its own column with a clickable link.</p>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Automated inventory report generated by SmarterTracks.</p>
    </div>`

  const sent = await sendReport({
    recipients,
    subject: `Company Tool Inventory — ${companyName} — ${dateLabel}`,
    html,
    filename,
    contentBase64,
  })
  if (!sent.ok) {
    return { company_id: company.company_id, type: 'company', status: 'error', detail: sent.detail }
  }
  return { company_id: company.company_id, type: 'company', status: 'sent', detail: `${totalTools} tools` }
}

// ---- Request handler ------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY is not configured' }, 500)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SERVICE_KEY') ?? ''
  )

  // Parse the body once (it can only be read a single time).
  let body: { type?: string; one_off?: boolean; company_id?: string } | null = null
  try {
    body = await req.json()
  } catch (_e) {
    body = null
  }

  // Three ways in:
  //  1) The scheduler sends the shared CRON secret -> process every due company.
  //  2) The CRON secret + { one_off, company_id, type } -> force-send ONE company
  //     immediately (used by the one-off "test the scheduler" feature). Never
  //     advances the weekly/monthly clock.
  //  3) An admin clicks "Send test now" (their JWT) -> force-send their own company.
  const cronSecret = req.headers.get('x-cron-secret') || ''
  let mode: 'cron' | 'manual'
  let manualCompanyId: string | null = null
  let manualType: ExportType = 'personal'

  if (CRON_SECRET && cronSecret === CRON_SECRET) {
    mode = 'cron'
  } else {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return json({ error: 'Invalid token' }, 401)
    const { data: profile } = await admin
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()
    const prof = profile as { role: string; company_id: string | null } | null
    if (!prof || prof.role !== 'admin' || !prof.company_id) {
      return json({ error: 'Only company admins can run this' }, 403)
    }
    mode = 'manual'
    manualCompanyId = prof.company_id
    if (body?.type === 'company' || body?.type === 'personal') manualType = body.type
  }

  const now = new Date()
  const results: { company_id: string; type: ExportType; status: string; detail?: string }[] = []

  // One-off scheduled run for a single company (force-send, ignore the clock).
  if (mode === 'cron' && body?.one_off && body?.company_id) {
    const oneOffType: ExportType = body.type === 'company' ? 'company' : 'personal'
    const { data, error } = await admin
      .from('company_settings')
      .select(COMPANY_FIELDS)
      .eq('company_id', body.company_id)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!data) {
      return json({ error: 'No export settings found for that company.' }, 400)
    }
    const company = data as CompanyRow
    const r =
      oneOffType === 'company'
        ? await exportCompanyTools(admin, company)
        : await exportPersonal(admin, company)
    return json({ mode: 'one_off', type: oneOffType, results: [r] })
  }

  if (mode === 'cron') {
    const { data, error } = await admin
      .from('company_settings')
      .select(COMPANY_FIELDS)
      .or('auto_export_enabled.eq.true,company_export_enabled.eq.true')
    if (error) return json({ error: error.message }, 500)

    for (const company of (data || []) as CompanyRow[]) {
      if (
        company.auto_export_enabled &&
        isDue(company.auto_export_frequency || 'weekly', company.auto_export_last_sent_at, now)
      ) {
        try {
          const r = await exportPersonal(admin, company)
          results.push(r)
          if (r.status === 'sent') {
            await admin
              .from('company_settings')
              .update({ auto_export_last_sent_at: now.toISOString() })
              .eq('company_id', company.company_id)
          }
        } catch (e) {
          results.push({ company_id: company.company_id, type: 'personal', status: 'error', detail: (e as Error).message })
        }
      }
      if (
        company.company_export_enabled &&
        isDue(company.company_export_frequency || 'weekly', company.company_export_last_sent_at, now)
      ) {
        try {
          const r = await exportCompanyTools(admin, company)
          results.push(r)
          if (r.status === 'sent') {
            await admin
              .from('company_settings')
              .update({ company_export_last_sent_at: now.toISOString() })
              .eq('company_id', company.company_id)
          }
        } catch (e) {
          results.push({ company_id: company.company_id, type: 'company', status: 'error', detail: (e as Error).message })
        }
      }
    }
    return json({ mode, processed: results.length, results })
  }

  // Manual single-company test (never advances the schedule clock).
  const { data, error } = await admin
    .from('company_settings')
    .select(COMPANY_FIELDS)
    .eq('company_id', manualCompanyId)
    .maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!data) {
    return json({ error: 'No export settings found. Add recipients and save first.' }, 400)
  }

  const company = data as CompanyRow
  const r =
    manualType === 'company'
      ? await exportCompanyTools(admin, company)
      : await exportPersonal(admin, company)
  results.push(r)
  return json({ mode, type: manualType, processed: results.length, results })
})
