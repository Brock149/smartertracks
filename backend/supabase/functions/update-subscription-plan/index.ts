import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { getPlanById } from '../_shared/plans.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()
    if (userErr || !userRow || userRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admins only' }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const { data: companyRow, error: compErr } = await supabase
      .from('companies')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userRow.company_id)
      .single()
    if (compErr || !companyRow?.stripe_subscription_id || !companyRow?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const origin = req.headers.get('origin')
    if (!origin) {
      return new Response(JSON.stringify({ error: 'Missing request origin' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const portalConfigId = Deno.env.get('STRIPE_BILLING_PORTAL_CONFIGURATION_ID')
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: companyRow.stripe_customer_id,
      return_url: `${origin}/admin/billing`,
      ...(portalConfigId ? { configuration: portalConfigId } : {}),
      flow_data: {
        type: 'subscription_update',
        subscription_update: {
          subscription: companyRow.stripe_subscription_id,
        },
      },
    })

    return new Response(
      JSON.stringify({ success: true, url: portalSession.url }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('Update subscription error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to update subscription' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
