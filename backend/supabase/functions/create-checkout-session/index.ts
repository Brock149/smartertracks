import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if the user is an admin and get their company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create checkout sessions' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const companyId = userData.company_id

    // Get company info to check if they already have a Stripe customer
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name, stripe_customer_id')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    let customerId = companyData.stripe_customer_id

    // Create Stripe customer if they don't have one
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: companyData.name,
        email: user.email,
        metadata: {
          company_id: companyId,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID')!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/admin/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/admin/settings?canceled=true`,
      client_reference_id: companyId,
      metadata: {
        company_id: companyId,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to create checkout session' }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 