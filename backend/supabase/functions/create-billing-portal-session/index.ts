import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    // Verify JWT and get user
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid JWT' }), { status: 401, headers: corsHeaders })
    }

    // Ensure user is admin & fetch company id
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()
    if (userErr || !userRow || userRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admins only' }), { status: 403, headers: corsHeaders })
    }

    const companyId = userRow.company_id

    // Get stripe_customer_id for this company
    const { data: compRow, error: compErr } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single()
    if (compErr || !compRow || !compRow.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Company has no Stripe customer' }), { status: 400, headers: corsHeaders })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    const session = await stripe.billingPortal.sessions.create({
      customer: compRow.stripe_customer_id,
      return_url: req.headers.get('origin') + '/admin/settings',
    })

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: corsHeaders })
  } catch (err: any) {
    console.error('portal session error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders })
  }
}) 
