import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }

    const { accessCode } = await req.json()
    if (!accessCode) {
      return new Response(JSON.stringify({ error: 'Access code is required' }), { status: 400, headers: corsHeaders })
    }

    // The account must not already belong to a company. Switching companies has
    // to go through the admin (remove) so a tech can't silently leave.
    const { data: me, error: meError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (meError || !me) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 400, headers: corsHeaders })
    }
    if (me.company_id) {
      return new Response(
        JSON.stringify({ error: 'You are already part of a company. Ask that company\u2019s admin to remove you before joining a new one.' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate the access code.
    const { data: codeData, error: codeError } = await supabase
      .from('company_access_codes')
      .select('company_id, role')
      .eq('code', accessCode)
      .eq('is_active', true)
      .single()

    if (codeError || !codeData) {
      return new Response(JSON.stringify({ error: 'Invalid access code' }), { status: 400, headers: corsHeaders })
    }

    // Attach the account to the new company with the code's role.
    const { error: updateError } = await supabase
      .from('users')
      .update({ company_id: codeData.company_id, role: codeData.role })
      .eq('id', user.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: corsHeaders })
    }

    // Keep the auth metadata role in sync (mirrors handle_new_user behaviour).
    try {
      await supabase.auth.admin.updateUserById(user.id, { user_metadata: { role: codeData.role } })
    } catch (_e) {
      // Non-fatal: the users table is the source of truth for role.
    }

    // Log a company activity event so the join shows in the Transactions feed.
    try {
      const { data: joined } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single()
      const name = joined?.name || user.email || 'A user'
      const email = joined?.email || user.email || ''
      await supabase.from('company_events').insert({
        company_id: codeData.company_id,
        event_type: 'user_joined',
        actor_id: user.id,
        actor_name: name,
        target_type: 'user',
        target_id: user.id,
        target_label: email ? `${name} (${email})` : name,
        details: `Joined the company as ${codeData.role}`,
      })
    } catch (_e) {
      // company_events table not present yet — ignore.
    }

    return new Response(
      JSON.stringify({ success: true, company_id: codeData.company_id, role: codeData.role }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: corsHeaders })
  }
})
