import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use the service role key for privileged access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header and verify the user
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

    // Get the user's company_id and verify admin role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can edit access codes' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { id, code, role, is_active } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Access code ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify the access code belongs to the same company
    const { data: accessCodeData, error: accessCodeError } = await supabaseClient
      .from('company_access_codes')
      .select('company_id')
      .eq('id', id)
      .single()

    if (accessCodeError || !accessCodeData || accessCodeData.company_id !== userData.company_id) {
      return new Response(
        JSON.stringify({ error: 'Access code not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Update the access code
    const { error: updateError } = await supabaseClient
      .from('company_access_codes')
      .update({ code, role, is_active })
      .eq('id', id)

    if (updateError) throw updateError

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