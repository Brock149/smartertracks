import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function stripBearer(raw: string): string {
  return raw.replace(/^Bearer\s+/i, '').trim()
}

function describeToken(token: string | null): string {
  if (!token) return 'missing'
  if (token.startsWith('sb_publishable_')) return 'publishable-key'
  if (token.startsWith('sb_secret_')) return 'secret-key'
  if (!token.startsWith('eyJ')) return 'not-jwt'
  const payload = jwtPayload(token)
  if (!payload) return 'jwt-unreadable'
  return typeof payload.role === 'string' ? `jwt-${payload.role}` : 'jwt'
}

function jwtPayload(token: string): { role?: string; sub?: string } | null {
  try {
    let part = token.split('.')[1]
    if (!part) return null
    part = part.replace(/-/g, '+').replace(/_/g, '/')
    while (part.length % 4) part += '='
    return JSON.parse(atob(part))
  } catch (_e) {
    return null
  }
}

function userJwtFromRequest(req: Request): string | null {
  const candidates: string[] = []
  for (const [_name, value] of req.headers.entries()) {
    if (!value) continue
    const stripped = stripBearer(value)
    if (stripped.startsWith('eyJ')) candidates.push(stripped)
  }

  const unique = [...new Set(candidates)]
  const isUserToken = (t: string) => {
    const payload = jwtPayload(t)
    if (!payload?.sub || typeof payload.sub !== 'string') return false
    // GoTrue puts postgres role in `role` (authenticated). Custom hooks
    // sometimes overwrite that with the app role (admin / tech).
    if (payload.role === 'service_role' || payload.role === 'anon') return false
    return true
  }
  return unique.find(isUserToken) || unique.find((t) => t.startsWith('eyJ')) || null
}

async function userIdFromAuthApi(req: Request, token: string): Promise<{ id: string | null; detail: string }> {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) return { id: null, detail: 'no-url' }

  const apiKeys = [
    req.headers.get('apikey'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY'),
    Deno.env.get('SERVICE_KEY'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  ].filter((k): k is string => !!k)

  let lastStatus = 'no-key'
  for (const apikey of apiKeys) {
    const res = await fetch(`${base.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey,
      },
    })
    lastStatus = String(res.status)
    if (!res.ok) continue
    const json = await res.json()
    if (typeof json?.id === 'string' && json.id.length > 0) return { id: json.id, detail: 'ok' }
  }
  return { id: null, detail: `auth-${lastStatus}` }
}

// Lets an existing, signed-in account that is NOT currently in a company join one
// using a company access code. This is the re-join path for a tech whose account
// survived being removed from a previous company. Their personal tools come with
// them (they're tied to the account, not the company).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const serviceKey = Deno.env.get('SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) {
      return jsonResponse({ success: false, error: 'Server is missing SERVICE_KEY' })
    }

    // Pin Authorization to the service role. The edge runtime otherwise
    // forwards the caller's JWT, and a logged-out-of-company user has no
    // RLS policy that allows SET role = 'admin' on their own row.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    })

    const token = userJwtFromRequest(req)
    if (!token) {
      const raw = req.headers.get('Authorization') || req.headers.get('authorization')
      return jsonResponse({
        success: false,
        error: `Invalid token (${describeToken(raw ? stripBearer(raw) : null)})`,
      })
    }
    const authed = await userIdFromAuthApi(req, token)
    if (!authed.id) {
      return jsonResponse({
        success: false,
        error: `Invalid token (${describeToken(token)}, ${authed.detail})`,
      })
    }
    const userId = authed.id

    let accessCode = ''
    try {
      const body = await req.json()
      accessCode = typeof body?.accessCode === 'string' ? body.accessCode.trim().toUpperCase() : ''
    } catch (_e) {
      return jsonResponse({ success: false, error: 'Access code is required' })
    }
    if (!accessCode) {
      return jsonResponse({ success: false, error: 'Access code is required' })
    }

    const { data: joined, error: joinError } = await supabase.rpc('join_company_with_code', {
      p_user_id: userId,
      p_code: accessCode,
    })

    if (joinError) {
      return jsonResponse({ success: false, error: joinError.message })
    }

    const companyId = joined?.company_id
    const joinedRole = joined?.role
    if (!joined?.success || !companyId || !joinedRole) {
      return jsonResponse({ success: false, error: joined?.error || 'Could not join' })
    }

    try {
      await supabase.auth.admin.updateUserById(userId, { user_metadata: { role: joinedRole, app_role: joinedRole } })
    } catch (_e) {
      // Non-fatal: the users table is the source of truth for role.
    }

    try {
      const { data: profile } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single()
      const name = profile?.name || 'A user'
      const email = profile?.email || ''
      await supabase.from('company_events').insert({
        company_id: companyId,
        event_type: 'user_joined',
        actor_id: userId,
        actor_name: name,
        target_type: 'user',
        target_id: userId,
        target_label: email ? `${name} (${email})` : name,
        details: `Joined the company as ${joinedRole}`,
      })
    } catch (_e) {
      // company_events table not present yet — ignore.
    }

    return jsonResponse({ success: true, company_id: companyId, role: joinedRole })
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message || 'Unknown error' }, 500)
  }
})
