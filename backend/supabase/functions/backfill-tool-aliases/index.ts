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
      return new Response(JSON.stringify({ error: 'Only admins can run alias backfill' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const limit = Math.min(Math.max(parseInt(body?.limit || '25', 10) || 25, 1), 100)
    const offset = Math.max(parseInt(body?.offset || '0', 10) || 0, 0)
    const onlyMissing = body?.only_missing !== false // default true
    const companyId =
      userData.role === 'superadmin' && body?.company_id
        ? body.company_id
        : userData.company_id

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'No company_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let query = supabaseClient
      .from('tools')
      .select('id, name, description')
      .eq('company_id', companyId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('number_numeric', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: tools, error: toolsError } = await query
    if (toolsError) {
      throw new Error(toolsError.message)
    }

    const results: Array<{ tool_id: string; ok: boolean; count?: number; error?: string; skipped?: boolean }> = []

    for (const tool of tools || []) {
      try {
        if (onlyMissing) {
          const { count } = await supabaseClient
            .from('tool_search_aliases')
            .select('id', { count: 'exact', head: true })
            .eq('tool_id', tool.id)
            .eq('source', 'ai')

          if ((count || 0) > 0) {
            results.push({ tool_id: tool.id, ok: true, skipped: true, count: 0 })
            continue
          }
        }

        const aliases = await generateAliasesWithHaiku(tool.name || '', tool.description || '')
        const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('replace_tool_ai_aliases', {
          p_tool_id: tool.id,
          p_aliases: aliases,
        })
        if (rpcError) throw new Error(rpcError.message)
        results.push({ tool_id: tool.id, ok: true, count: rpcResult?.count ?? aliases.length })
      } catch (e: any) {
        results.push({ tool_id: tool.id, ok: false, error: e.message || 'failed' })
      }
    }

    const processed = results.filter((r) => !r.skipped).length
    const succeeded = results.filter((r) => r.ok && !r.skipped).length
    const failed = results.filter((r) => !r.ok).length
    const skipped = results.filter((r) => r.skipped).length

    return new Response(
      JSON.stringify({
        success: true,
        company_id: companyId,
        offset,
        limit,
        batch_size: (tools || []).length,
        processed,
        succeeded,
        failed,
        skipped,
        next_offset: offset + (tools || []).length,
        has_more: (tools || []).length === limit,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('backfill-tool-aliases error', error)
    return new Response(JSON.stringify({ error: error.message || 'Backfill failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
