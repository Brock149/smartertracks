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
      .select('role, company_id, name')
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
    const { group_id, name, description, photo_url, checklist, estimated_cost, location } = await req.json()

    // Validate required fields
    if (!group_id || !name) {
      return new Response(
        JSON.stringify({ error: 'Group and name are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch the group and confirm it belongs to this company and isn't deleted
    const { data: group, error: groupError } = await supabaseClient
      .from('tool_groups')
      .select('id, name, is_deleted, default_owner_id, default_owner_mode')
      .eq('id', group_id)
      .eq('company_id', userData.company_id)
      .single()

    if (groupError || !group) {
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (group.is_deleted) {
      return new Response(
        JSON.stringify({ error: 'This group has been deleted' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Resolve the owner based on the group's default-owner mode
    let ownerId: string | null = null
    const ownerMode = group.default_owner_mode || 'company_default'

    if (ownerMode === 'specific') {
      ownerId = group.default_owner_id || null
    } else if (ownerMode === 'unassigned') {
      ownerId = null
    } else {
      // 'company_default': fall back to the company's default owner settings
      const { data: companySettings } = await supabaseClient
        .from('company_settings')
        .select('default_owner_id, use_default_owner')
        .eq('company_id', userData.company_id)
        .single()

      if (companySettings?.use_default_owner && companySettings.default_owner_id) {
        ownerId = companySettings.default_owner_id
      }
    }

    // Compute the next tool number as "{Group Name} #{N}", based on how many
    // tools are already in the group, bumping further on collision since
    // tool numbers must be unique within the company.
    const { count: memberCount, error: countError } = await supabaseClient
      .from('tool_group_members')
      .select('tool_id', { count: 'exact', head: true })
      .eq('group_id', group_id)

    if (countError) {
      return new Response(
        JSON.stringify({ error: 'Failed to determine next tool number: ' + countError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let nextIndex = (memberCount || 0) + 1
    let candidateNumber = `${group.name} #${nextIndex}`
    const MAX_ATTEMPTS = 1000
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { data: existing } = await supabaseClient
        .from('tools')
        .select('id')
        .eq('number', candidateNumber)
        .eq('company_id', userData.company_id)
        .maybeSingle()

      if (!existing) break

      nextIndex += 1
      candidateNumber = `${group.name} #${nextIndex}`
    }

    // Use the database function to create the tool, link it to the group,
    // and set its initial location. The admin can edit the pre-filled
    // location (which defaults to the group's name) before submitting.
    const resolvedLocation = typeof location === 'string' && location.trim() ? location.trim() : group.name

    const { data: toolId, error: toolError } = await supabaseClient
      .rpc('create_group_tool_with_checklist', {
        p_group_id: group_id,
        p_number: candidateNumber,
        p_name: name,
        p_description: description || '',
        p_photo_url: photo_url || '',
        p_company_id: userData.company_id,
        p_checklist: checklist || [],
        p_owner_id: ownerId,
        p_location: resolvedLocation
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

    // Best-effort: record this as a company activity event.
    try {
      await supabaseClient.from('company_events').insert({
        company_id: userData.company_id,
        event_type: 'tool_created',
        actor_id: user.id,
        actor_name: userData.name || user.email || 'An admin',
        target_type: 'tool',
        target_id: toolId,
        target_label: `#${candidateNumber} - ${name}`,
        details: `Tool created in group "${group.name}"`,
      })
    } catch (_e) {
      // company_events table not present yet — ignore.
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
