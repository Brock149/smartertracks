import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Superadmin-only: queues a ONE-OFF inventory export to run at a chosen time so
// the scheduler can be tested without waiting for the weekly job. A separate
// minutely cron (process-scheduled-export-runs) picks the row up when it's due.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SERVICE_KEY') ?? ''
  )

  // Must be a signed-in superadmin.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile as { role: string }).role !== 'superadmin') {
    return json({ error: 'Only superadmins can schedule test runs' }, 403)
  }

  let body: { company_id?: string; type?: string; minutes_from_now?: number; run_at?: string }
  try {
    body = await req.json()
  } catch (_e) {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!body.company_id) return json({ error: 'company_id is required' }, 400)
  const exportType = body.type === 'company' ? 'company' : 'personal'

  let runAt: Date
  if (body.run_at) {
    runAt = new Date(body.run_at)
    if (isNaN(runAt.getTime())) return json({ error: 'Invalid run_at' }, 400)
  } else {
    const minutes = Number(body.minutes_from_now)
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 5
    runAt = new Date(Date.now() + safeMinutes * 60 * 1000)
  }

  const { data, error } = await admin
    .from('scheduled_export_runs')
    .insert({
      company_id: body.company_id,
      export_type: exportType,
      run_at: runAt.toISOString(),
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)

  return json({ success: true, run: data, run_at: runAt.toISOString() })
})
