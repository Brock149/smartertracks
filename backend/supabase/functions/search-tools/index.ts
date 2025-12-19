import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? '' // service role for RPC
    )

    // Require auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    // Get company_id for isolation
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.company_id) {
      return new Response(JSON.stringify({ error: 'User not found or no company' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Parse query params
    const url = new URL(req.url)
    const term = (url.searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)

    if (term.length < 1) {
      return new Response(JSON.stringify({ error: 'Query too short' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Call RPC that leverages indexes and company_id filtering
    const { data, error } = await supabaseClient.rpc('search_tools', {
      p_company_id: userData.company_id,
      p_term: term,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      console.error('search_tools RPC error', error)
      return new Response(JSON.stringify({ error: 'Search failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ results: data || [] }), {
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

