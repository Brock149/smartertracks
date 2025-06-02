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
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user's session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
    const { number, name, description, photo_url, checklist } = await req.json()

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

    // Create the tool with the user's company_id
    const { data: toolData, error: toolError } = await supabaseClient
      .from('tools')
      .insert([{
        number,
        name,
        description,
        photo_url,
        company_id: userData.company_id
      }])
      .select()
      .single()

    if (toolError) {
      return new Response(
        JSON.stringify({ error: toolError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If there are checklist items, insert them directly
    if (checklist && checklist.length > 0) {
      const checklistItems = checklist.map((item: any) => ({
        tool_id: toolData.id,
        item_name: item.item_name,
        required: item.required,
        company_id: userData.company_id
      }))

      const { error: checklistError } = await supabaseClient
        .from('tool_checklists')
        .insert(checklistItems)

      if (checklistError) {
        // If checklist insertion fails, delete the tool and return error
        await supabaseClient
          .from('tools')
          .delete()
          .eq('id', toolData.id)

        return new Response(
          JSON.stringify({ error: 'Failed to create checklist items: ' + checklistError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tool: toolData
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