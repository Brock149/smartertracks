import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface RunRow {
  id: string
  company_id: string
  export_type: 'personal' | 'company'
  run_at: string
}

// Minutely maintenance job: runs any one-off inventory exports that are now due.
// Each due row is handed to scheduled-inventory-export in one-off mode, then
// marked done/error. Triggered by the shared CRON secret only.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = req.headers.get('x-cron-secret') || ''
  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(SUPABASE_URL, Deno.env.get('SERVICE_KEY') ?? '')

  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('scheduled_export_runs')
    .select('id, company_id, export_type, run_at')
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('run_at', { ascending: true })
    .limit(25)

  if (error) return json({ error: error.message }, 500)

  const due = (data || []) as RunRow[]
  const results: { id: string; status: string; detail?: string }[] = []

  for (const run of due) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/scheduled-inventory-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': CRON_SECRET,
        },
        body: JSON.stringify({ one_off: true, company_id: run.company_id, type: run.export_type }),
      })
      const payload = await res.json().catch(() => ({}))
      const ok = res.ok && payload?.results?.[0]?.status === 'sent'
      const detail = payload?.results?.[0]?.detail || payload?.error || (ok ? 'sent' : 'failed')

      await admin
        .from('scheduled_export_runs')
        .update({
          status: ok ? 'done' : 'error',
          result: String(detail).slice(0, 300),
          processed_at: new Date().toISOString(),
        })
        .eq('id', run.id)

      results.push({ id: run.id, status: ok ? 'done' : 'error', detail: String(detail) })
    } catch (e) {
      await admin
        .from('scheduled_export_runs')
        .update({
          status: 'error',
          result: (e as Error).message.slice(0, 300),
          processed_at: new Date().toISOString(),
        })
        .eq('id', run.id)
      results.push({ id: run.id, status: 'error', detail: (e as Error).message })
    }
  }

  return json({ processed: results.length, results })
})
