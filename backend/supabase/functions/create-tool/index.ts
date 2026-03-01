import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key for better permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? ''
    )

    // Get the authorization header and verify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the user's data to check role and company
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Only admins can create tools
    if (userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create tools' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the request body
    const { number, name, description, photo_url, checklist, estimated_cost } = await req.json()

    // Validate required fields
    if (!number || !name) {
      return new Response(
        JSON.stringify({ error: 'Number and name are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Use the database function to create the tool with checklist
    const { data: toolId, error: toolError } = await supabaseClient
      .rpc('create_tool_with_checklist', {
        p_number: number,
        p_name: name,
        p_description: description || '',
        p_photo_url: photo_url || '',
        p_company_id: userData.company_id,
        p_checklist: checklist || []
      })

    if (toolError) {
      return new Response(
        JSON.stringify({ error: toolError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Set estimated_cost if provided (RPC doesn't handle this field)
    if (estimated_cost != null) {
      const { error: costError } = await supabaseClient
        .from('tools')
        .update({ estimated_cost: Math.round(Number(estimated_cost)) })
        .eq('id', toolId)

      if (costError) {
        console.error('Failed to set estimated_cost:', costError.message)
      }
    }

    // Get the created tool data to return
    const { data: toolData, error: fetchError } = await supabaseClient
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .single()

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Tool created but failed to fetch data: ' + fetchError.message }),
        {
          status: 200, // Tool was created successfully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tool: toolData,
        id: toolId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 
