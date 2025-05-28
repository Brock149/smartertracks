import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-role',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Detect service role
    const isServiceRole = !!req.headers.get('x-service-role')
    let userId = null
    let isAdmin = false

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
        auth: { persistSession: false }
      }
    )

    // If not service role, check user and admin
    if (!isServiceRole) {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: No user' }), { status: 401, headers: corsHeaders })
      }
      userId = user.id
      // Check admin role
      const { data: userData } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (!userData || userData.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized: Not admin' }), { status: 403, headers: corsHeaders })
      }
      isAdmin = true
    }

    // Parse request
    const { tool_id, item_name, required } = await req.json()
    if (!tool_id || !item_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    // Insert checklist item
    const { data, error } = await supabaseClient
      .from('tool_checklists')
      .insert([{ tool_id, item_name, required: required ?? false }])
      .select()
      .single()
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
}) 