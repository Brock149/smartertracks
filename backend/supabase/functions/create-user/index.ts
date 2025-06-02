import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if the user is an admin and get their company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Get the admin's company_id to assign to the new user
    const adminCompanyId = userData.company_id

    // Get the request body
    const { name, email, password, role } = await req.json()

    // 1. Create user in Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !authData?.user?.id) {
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create user in Auth' }),
        { status: 400, headers: corsHeaders }
      )
    }
    const userId = authData.user.id

    // 2. Insert user info into users table with the admin's company_id
    const { error: dbError } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      role,
      company_id: adminCompanyId,
    })
    if (dbError) {
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
