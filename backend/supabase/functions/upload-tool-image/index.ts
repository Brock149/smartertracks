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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tool_id, image_url } = await req.json()

    // Get the user's session
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid user')
    }

    // Get the user's company_id
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      throw new Error('Could not fetch user data')
    }

    // Verify the tool belongs to the user's company
    const { data: toolData, error: toolError } = await supabaseClient
      .from('tools')
      .select('company_id')
      .eq('id', tool_id)
      .single()

    if (toolError || !toolData) {
      throw new Error('Could not fetch tool data')
    }

    if (toolData.company_id !== userData.company_id) {
      throw new Error('Tool does not belong to your company')
    }

    // Insert the image record with company_id
    const { data, error } = await supabaseClient
      .from('tool_images')
      .insert([
        {
          tool_id,
          image_url,
          company_id: userData.company_id
        }
      ])
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 