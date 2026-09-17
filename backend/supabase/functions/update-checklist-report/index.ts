import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_STATUSES = ['no_change', 'in_progress', 'resolved'] as const
type ResolutionStatus = typeof VALID_STATUSES[number]

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isStaff(role: string | null | undefined) {
  return role === 'admin' || role === 'superadmin'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401)
    }

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('company_id, role, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !isStaff(userData.role)) {
      return json({ error: 'Only admins can update checklist reports' }, 403)
    }

    const { id, resolution_status, notes } = await req.json()

    if (!id) {
      return json({ error: 'Report ID is required' }, 400)
    }

    if (!VALID_STATUSES.includes(resolution_status)) {
      return json({ error: 'Invalid work status' }, 400)
    }

    const trimmedNotes = typeof notes === 'string' ? notes.trim() : ''
    if (resolution_status === 'in_progress' && !trimmedNotes) {
      return json({ error: 'Add a comment so others can see what is in progress (waiting on parts, repair scheduled, etc.)' }, 400)
    }

    const { data: reportData, error: reportError } = await supabaseClient
      .from('checklist_reports')
      .select('id, company_id, resolution_status, resolution_notes')
      .eq('id', id)
      .single()

    if (reportError || !reportData || reportData.company_id !== userData.company_id) {
      return json({ error: 'Checklist report not found or not in the same company' }, 400)
    }

    const nextStatus = resolution_status as ResolutionStatus
    const nextNotes = trimmedNotes || (nextStatus === 'resolved' ? (reportData.resolution_notes || null) : null)
    const unchanged =
      reportData.resolution_status === nextStatus &&
      (reportData.resolution_notes || null) === nextNotes

    if (unchanged) {
      return json({ success: true, unchanged: true })
    }

    const now = new Date().toISOString()
    const actorName = userData.name || user.email || 'An admin'
    const update: Record<string, unknown> = {
      resolution_status: nextStatus,
      resolution_notes: nextNotes,
      resolution_updated_at: now,
      resolution_updated_by: user.id,
      resolution_updated_by_name: actorName,
    }

    if (nextStatus === 'resolved') {
      update.resolved_at = now
      update.resolved_by = user.id
      update.resolved_by_name = actorName
    } else {
      update.resolved_at = null
      update.resolved_by = null
      update.resolved_by_name = null
    }

    const { error: updateError } = await supabaseClient
      .from('checklist_reports')
      .update(update)
      .eq('id', id)

    if (updateError) throw updateError

    const { error: historyError } = await supabaseClient
      .from('checklist_report_updates')
      .insert({
        report_id: id,
        company_id: userData.company_id,
        resolution_status: nextStatus,
        notes: trimmedNotes || null,
        actor_id: user.id,
        actor_name: actorName,
      })

    if (historyError) throw historyError

    return json({ success: true })
  } catch (error) {
    return json({ error: error.message }, 400)
  }
})
