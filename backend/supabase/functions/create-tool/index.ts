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
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const { number, name, description, photo_url, checklist } = await req.json()

    if (!number || !name) {
      return new Response(
        JSON.stringify({ error: 'Tool number and name are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // First create the tool
    const { data: toolData, error: toolError } = await supabaseClient
      .from('tools')
      .insert([{
        number,
        name,
        description,
        photo_url
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

    // Then create checklist items if any exist
    if (checklist && checklist.length > 0) {
      const { error: checklistError } = await supabaseClient
        .from('tool_checklists')
        .insert(
          checklist.map((item: { item_name: string; required: boolean }) => ({
            tool_id: toolData.id,
            item_name: item.item_name,
            required: item.required
          }))
        )

      if (checklistError) {
        // If checklist creation fails, delete the tool to maintain consistency
        await supabaseClient
          .from('tools')
          .delete()
          .eq('id', toolData.id)

        return new Response(
          JSON.stringify({ error: checklistError.message }),
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