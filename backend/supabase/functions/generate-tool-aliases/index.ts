import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateAliasesWithHaiku } from '../_shared/generateToolAliases.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function generateAndStoreAliases(
  supabaseClient: ReturnType<typeof createClient>,
  toolId: string
): Promise<{ aliases: string[]; count: number }> {
  const { data: tool, error } = await supabaseClient
    .from('tools')
    .select('id, name, is_deleted')
    .eq('id', toolId)
    .single()

  if (error || !tool) {
    throw new Error('Tool not found')
  }
  if (tool.is_deleted) {
    return { aliases: [], count: 0 }
  }

  const aliases = await generateAliasesWithHaiku(tool.name || '')

  const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('replace_tool_ai_aliases', {
    p_tool_id: toolId,
    p_aliases: aliases,
  })

  if (rpcError) {
    throw new Error(rpcError.message)
  }

  return { aliases, count: rpcResult?.count ?? aliases.length }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Only admins can generate aliases' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const toolId = body?.tool_id
    if (!toolId) {
      return new Response(JSON.stringify({ error: 'tool_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Company isolation (superadmin can skip)
    if (userData.role !== 'superadmin') {
      const { data: tool } = await supabaseClient
        .from('tools')
        .select('company_id')
        .eq('id', toolId)
        .single()
      if (!tool || tool.company_id !== userData.company_id) {
        return new Response(JSON.stringify({ error: 'Tool not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const result = await generateAndStoreAliases(supabaseClient, toolId)

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('generate-tool-aliases error', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate aliases' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
