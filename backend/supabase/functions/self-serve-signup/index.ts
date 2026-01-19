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
    const body = await req.json().catch(() => ({}))
    const companyName = typeof body?.company_name === 'string' ? body.company_name.trim() : ''
    const adminName = typeof body?.admin_name === 'string' ? body.admin_name.trim() : ''
    const adminEmail = typeof body?.admin_email === 'string' ? body.admin_email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const planId = typeof body?.plan_id === 'string' ? body.plan_id : null
    const billingCycle =
      body?.billing_cycle === 'monthly' || body?.billing_cycle === 'annual'
        ? body.billing_cycle
        : null

    if (!companyName || !adminName || !adminEmail || !planId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const plan = getPlanById(planId)
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle()

    if (existingUserError) {
      throw existingUserError
    }

    if (existingUser?.id) {
      return new Response(JSON.stringify({ error: 'Email is already in use' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (plan.id === 'trial') {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          is_active: true,
          user_limit: plan.userLimit,
          tool_limit: plan.toolLimit,
          enforcement_mode: plan.enforcementMode,
          tier_name: plan.name,
          plan_id: plan.id,
          billing_cycle: plan.billingCycle,
          trial_expires_at: null,
        })
        .select('id')
        .single()

      if (companyError || !company?.id) {
        throw companyError || new Error('Failed to create company')
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password,
        email_confirm: true,
      })

      if (authError || !authData?.user?.id) {
        throw authError || new Error('Failed to create admin user')
      }

      const userId = authData.user.id
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          name: adminName,
          email: adminEmail,
          role: 'admin',
          company_id: company.id,
        })

      if (userError) {
        await supabase.auth.admin.deleteUser(userId)
        throw userError
      }

      await supabase
        .from('companies')
        .update({ created_by: userId })
        .eq('id', company.id)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'trial',
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        is_active: false,
        suspended_at: new Date().toISOString(),
        user_limit: plan.userLimit,
        tool_limit: plan.toolLimit,
        enforcement_mode: plan.enforcementMode,
        tier_name: plan.name,
        plan_id: plan.id,
        billing_cycle: plan.billingCycle,
        trial_expires_at: null,
      })
      .select('id')
      .single()

    if (companyError || !company?.id) {
      throw companyError || new Error('Failed to create company')
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user?.id) {
      await supabase.from('companies').delete().eq('id', company.id)
      throw authError || new Error('Failed to create admin user')
    }

    const userId = authData.user.id
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: adminName,
        email: adminEmail,
        role: 'admin',
        company_id: company.id,
      })

    if (userError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('companies').delete().eq('id', company.id)
      throw userError
    }

    await supabase
      .from('companies')
      .update({ created_by: userId })
      .eq('id', company.id)

    const selectedBillingCycle =
      billingCycle ??
      plan.billingCycle ??
      (plan.stripePriceMonthly ? 'monthly' : 'annual')
    const priceId =
      selectedBillingCycle === 'annual' ? plan.stripePriceAnnual : plan.stripePriceMonthly

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Plan is not configured for this billing cycle' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    const customer = await stripe.customers.create({
      email: adminEmail,
      name: companyName,
      metadata: {
        company_name: companyName,
        admin_name: adminName,
        admin_email: adminEmail,
      },
    })

    await supabase
      .from('companies')
      .update({ stripe_customer_id: customer.id })
      .eq('id', company.id)

    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || ''
    const successUrl = `${origin}/get-started/success`
    const cancelUrl = `${origin}/get-started?canceled=true`

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: company.id,
      metadata: {
        company_id: company.id,
        company_name: companyName,
        admin_name: adminName,
        admin_email: adminEmail,
        plan_id: plan.id,
        billing_cycle: selectedBillingCycle,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: corsHeaders })
  } catch (err: any) {
    console.error('Self-serve signup error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to start signup' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
