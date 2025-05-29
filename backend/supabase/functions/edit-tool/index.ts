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
    const { id, number, name, description, photo_url, checklist } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Tool ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the service role key for privileged access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update the tool in the tools table
    const { error: updateError } = await supabaseClient
      .from('tools')
      .update({ number, name, description, photo_url })
      .eq('id', id)

    if (updateError) throw updateError

    // If a new checklist is provided, update the checklist items
    if (checklist && checklist.length > 0) {
      // First, delete existing checklist items for this tool
      const { error: deleteError } = await supabaseClient
        .from('tool_checklists')
        .delete()
        .eq('tool_id', id)
      if (deleteError) throw deleteError

      // Then insert the new checklist items
      const { error: insertError } = await supabaseClient
        .from('tool_checklists')
        .insert(
          checklist.map((item: { item_name: string; required: boolean }) => ({
            tool_id: id,
            item_name: item.item_name,
            required: item.required
          }))
        )
      if (insertError) throw insertError
    }

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