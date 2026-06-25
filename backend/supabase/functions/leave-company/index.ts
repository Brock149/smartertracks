import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lets a signed-in user remove THEMSELVES from their company (self-serve), in
// case their employer forgets to remove them. Their account and personal tools
// survive — only their access to this company is removed. Mirrors
// remove-user-from-company, but the caller is the target.
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
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }

    const { data: me, error: meError } = await supabaseClient
      .from('users')
      .select('company_id, role, name')
      .eq('id', user.id)
      .single()

    if (meError || !me) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders })
    }

    if (!me.company_id) {
      return new Response(JSON.stringify({ error: "You're not part of a company." }), { status: 400, headers: corsHeaders })
    }

    // Don't let the last admin leave and orphan the company.
    if (me.role === 'admin') {
      const { count } = await supabaseClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', me.company_id)
        .eq('role', 'admin')

      if ((count ?? 0) <= 1) {
        return new Response(
          JSON.stringify({ error: 'You are the only admin. Make someone else an admin before leaving.' }),
          { status: 400, headers: corsHeaders }
        )
      }
    }

    const { error: rpcError } = await supabaseClient.rpc('remove_user_from_company', { p_user_id: user.id })
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 400, headers: corsHeaders })
    }

    // Best-effort: record this as a company activity event (table is optional;
    // if it doesn't exist yet this simply no-ops).
    try {
      await supabaseClient.from('company_events').insert({
        company_id: me.company_id,
        event_type: 'user_left',
        actor_id: user.id,
        actor_name: me.name || user.email || 'A user',
        target_type: 'user',
        target_id: user.id,
        target_label: me.name || user.email || 'A user',
        details: 'Left the company',
      })
    } catch (_e) {
      // company_events not present yet — ignore.
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 400, headers: corsHeaders })
  }
})
