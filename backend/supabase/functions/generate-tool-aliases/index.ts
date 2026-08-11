import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

async function generateAliasesWithHaiku(name: string, description: string): Promise<string[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const prompt = `You generate search aliases for a construction / trades tool inventory system.
Given a tool name and optional description, return ONLY a JSON array of short alternate search terms people might type.
Include: common misspellings, brand nicknames, trade slang, abbreviations, and spacing/punctuation variants.
Do NOT include the exact tool name itself. Max 12 aliases. Lowercase preferred. No explanations.

Name: ${name}
Description: ${description || '(none)'}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Anthropic API error (${resp.status}): ${body}`)
  }

  const json = await resp.json()
  const text = (json?.content || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n')
    .trim()

  // Extract JSON array even if model wraps it in markdown fences
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []

  const parsed = JSON.parse(match[0])
  if (!Array.isArray(parsed)) return []

  const cleaned = parsed
    .map((a) => String(a || '').trim())
    .filter((a) => a.length > 0 && a.length <= 80)
    .slice(0, 12)

  return [...new Set(cleaned)]
}

export async function generateAndStoreAliases(
  supabaseClient: ReturnType<typeof createClient>,
  toolId: string
): Promise<{ aliases: string[]; count: number }> {
  const { data: tool, error } = await supabaseClient
    .from('tools')
    .select('id, name, description, is_deleted')
    .eq('id', toolId)
    .single()

  if (error || !tool) {
    throw new Error('Tool not found')
  }
  if (tool.is_deleted) {
    return { aliases: [], count: 0 }
  }

  const aliases = await generateAliasesWithHaiku(tool.name || '', tool.description || '')

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
