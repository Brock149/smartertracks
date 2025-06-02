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
        JSON.stringify({ error: 'Only admins can edit tools' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { id, number, name, description, photo_url, checklist } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Tool ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify the tool belongs to the same company
    const { data: toolData, error: toolError } = await supabaseClient
      .from('tools')
      .select('company_id')
      .eq('id', id)
      .single()

    if (toolError || !toolData || toolData.company_id !== userData.company_id) {
      return new Response(
        JSON.stringify({ error: 'Tool not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

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

      // Then insert the new checklist items with company_id
      const { error: insertError } = await supabaseClient
        .from('tool_checklists')
        .insert(
          checklist.map((item: { item_name: string; required: boolean }) => ({
            tool_id: id,
            item_name: item.item_name,
            required: item.required,
            company_id: userData.company_id
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