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
      Deno.env.get('SERVICE_KEY') ?? ''
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

    // Get the requesting user's company_id and role
    const { data: requestingUserData, error: requestingUserError } = await supabaseClient
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (requestingUserError || !requestingUserData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const { id, name, email, role } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify the target user belongs to the same company
    const { data: targetUserData, error: targetUserError } = await supabaseClient
      .from('users')
      .select('company_id, role')
      .eq('id', id)
      .single()

    if (targetUserError || !targetUserData || targetUserData.company_id !== requestingUserData.company_id) {
      return new Response(
        JSON.stringify({ error: 'Target user not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Only admins can edit users
    if (requestingUserData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can edit users' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Update the user in the users table
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ name, email, role })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user in database' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Update the user in Supabase Auth
    const { error: authError2 } = await supabaseClient.auth.admin.updateUserById(
      id,
      { email, user_metadata: { name, role } }
    )

    if (authError2) {
      console.error('Error updating auth user:', authError2)
      return new Response(
        JSON.stringify({ error: 'Failed to update user in auth system' }),
        { status: 400, headers: corsHeaders }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 
