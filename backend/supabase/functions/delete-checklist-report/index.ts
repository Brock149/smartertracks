import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('company_id, role, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !isStaff(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only admins can resolve checklist reports' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Report ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data: reportData, error: reportError } = await supabaseClient
      .from('checklist_reports')
      .select('id, company_id, resolution_status')
      .eq('id', id)
      .single()

    if (reportError || !reportData || reportData.company_id !== userData.company_id) {
      return new Response(
        JSON.stringify({ error: 'Checklist report not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Keep the report for history. Marking it resolved is what removes it
    // from the open-issues warning on claim/transfer.
    if (reportData.resolution_status !== 'resolved') {
      const now = new Date().toISOString()
      const actorName = userData.name || user.email || 'An admin'

      const { error: updateError } = await supabaseClient
        .from('checklist_reports')
        .update({
          resolution_status: 'resolved',
          resolution_updated_at: now,
          resolution_updated_by: user.id,
          resolution_updated_by_name: actorName,
          resolved_at: now,
          resolved_by: user.id,
          resolved_by_name: actorName,
        })
        .eq('id', id)

      if (updateError) throw updateError

      const { error: historyError } = await supabaseClient
        .from('checklist_report_updates')
        .insert({
          report_id: id,
          company_id: userData.company_id,
          resolution_status: 'resolved',
          notes: null,
          actor_id: user.id,
          actor_name: actorName,
        })

      if (historyError) throw historyError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
