import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Removes a user from the caller's company WITHOUT deleting their account.
// The account (and the tech's personal tools) survive; they simply lose access
// to this company's tools/info. Mirrors delete-user's auth checks but calls the
// additive remove_user_from_company() database function instead of delete_user.
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

    // Caller must be an admin.
    const { data: requestingUserData, error: requestingUserError } = await supabaseClient
      .from('users')
      .select('company_id, role, name')
      .eq('id', user.id)
      .single()

    if (requestingUserError || !requestingUserData || requestingUserData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can remove users' }), { status: 403, headers: corsHeaders })
    }

    const { id } = await req.json()
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: corsHeaders })
    }

    if (id === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot remove yourself from the company' }), { status: 400, headers: corsHeaders })
    }

    // Target must belong to the caller's company.
    const { data: targetUserData, error: targetUserError } = await supabaseClient
      .from('users')
      .select('company_id, name, email')
      .eq('id', id)
      .single()

    if (targetUserError || !targetUserData || targetUserData.company_id !== requestingUserData.company_id) {
      return new Response(JSON.stringify({ error: 'Target user not found or not in the same company' }), { status: 400, headers: corsHeaders })
    }

    const { error: rpcError } = await supabaseClient.rpc('remove_user_from_company', { p_user_id: id })
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 400, headers: corsHeaders })
    }

    // Best-effort: record this as a company activity event.
    try {
      await supabaseClient.from('company_events').insert({
        company_id: requestingUserData.company_id,
        event_type: 'user_removed',
        actor_id: user.id,
        actor_name: requestingUserData.name || user.email || 'An admin',
        target_type: 'user',
        target_id: id,
        target_label: targetUserData.email ? `${targetUserData.name} (${targetUserData.email})` : targetUserData.name,
        details: 'Removed from company by admin',
      })
    } catch (_e) {
      // company_events table not present yet — ignore.
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 400, headers: corsHeaders })
  }
})
