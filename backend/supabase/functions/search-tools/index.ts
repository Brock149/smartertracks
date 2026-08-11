import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const payload = decodeJwtPayload(token)
    const userId = payload?.sub
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_KEY') ?? ''
    )

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (userError || !userData?.company_id) {
      return new Response(JSON.stringify({ error: 'User not found or no company' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const url = new URL(req.url)
    const term = (url.searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)
    const scope = (url.searchParams.get('scope') || 'global').trim().toLowerCase()
    const groupId = url.searchParams.get('group_id') || null
    // Optional override; default for scope=mine is the caller
    const ownerIdParam = url.searchParams.get('owner_id')
    const ownerId = scope === 'mine' ? (ownerIdParam || userId) : (ownerIdParam || null)

    if (term.length < 1) {
      return new Response(JSON.stringify({ error: 'Query too short' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (scope === 'group' && !groupId) {
      return new Response(JSON.stringify({ error: 'group_id required for scope=group' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { data, error } = await supabaseClient.rpc('search_tools', {
      p_company_id: userData.company_id,
      p_term: term,
      p_limit: limit,
      p_offset: offset,
      p_scope: scope,
      p_group_id: groupId,
      p_owner_id: ownerId,
    })

    if (error) {
      console.error('search_tools RPC error', error)
      return new Response(JSON.stringify({ error: 'Search failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const toolIds = (data || []).map((t: any) => t.id)

    let storedAtByTool: Record<string, string> = {}
    if (toolIds.length > 0) {
      const { data: txData } = await supabaseClient
        .rpc('latest_transactions_for_tools', { p_tool_ids: toolIds })

      if (txData) {
        for (const tx of txData) {
          storedAtByTool[tx.tool_id] = tx.stored_at ?? ''
        }
      } else {
        const { data: fallbackTx } = await supabaseClient
          .from('tool_transactions')
          .select('tool_id, stored_at, timestamp')
          .in('tool_id', toolIds)
          .order('timestamp', { ascending: false })

        if (fallbackTx) {
          for (const tx of fallbackTx) {
            if (!storedAtByTool[tx.tool_id]) {
              storedAtByTool[tx.tool_id] = tx.stored_at ?? ''
            }
          }
        }
      }
    }

    const results = (data || []).map((tool: any) => ({
      ...tool,
      company_id: userData.company_id,
      stored_at: storedAtByTool[tool.id] ?? '',
    }))

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
