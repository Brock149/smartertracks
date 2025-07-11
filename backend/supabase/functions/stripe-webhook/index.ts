import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // TEMP DEBUG: ensure secret is loaded
  console.log('ENV secret length:', (Deno.env.get('STRIPE_WEBHOOK_SECRET') || '').length)
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // Get the raw body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('No stripe signature found')
      return new Response(
        JSON.stringify({ error: 'No stripe signature' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      const cryptoProvider = Stripe.createSubtleCryptoProvider()
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        cryptoProvider
      )
      console.log('Webhook signature verified for event:', event.type)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    console.log('Processing event:', event.type, 'ID:', event.id)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id)
        console.log('Company ID:', session.client_reference_id)
        console.log('Customer ID:', session.customer)
        console.log('Subscription ID:', session.subscription)

        // Get subscription details if there is one
        let subscriptionData = null
        if (session.subscription) {
          try {
            subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string)
            console.log('Retrieved subscription:', subscriptionData.id, 'Status:', subscriptionData.status)
          } catch (err) {
            console.error('Error fetching subscription:', err)
          }
        }

        // Determine period end (new API may omit current_period_end on root)
        const periodEndRaw = subscriptionData?.current_period_end ?? subscriptionData?.items?.data?.[0]?.current_period_end ?? null

        // Update company with subscription info
        const updateData = {
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_status: subscriptionData ? subscriptionData.status : 'active',
          stripe_price_id: subscriptionData && subscriptionData.items?.data?.length
            ? (subscriptionData.items.data[0].price as Stripe.Price).id
            : null,
          current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
          is_active: true,
          suspended_at: null
        }

        console.log('Updating company with data:', updateData)

        const { error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', session.client_reference_id!)

        if (error) {
          console.error('Error updating company after checkout:', error)
          throw error // This will cause the webhook to fail and retry
        }

        console.log('Successfully updated company:', session.client_reference_id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)
        console.log('Customer ID:', subscription.customer)
        console.log('Status:', subscription.status)

        const priceId = subscription.items?.data?.length ? (subscription.items.data[0].price as Stripe.Price).id : null

        const subPeriodEndRaw = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? null

        const { error } = await supabase
          .from('companies')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            stripe_status: subscription.status,
            current_period_end: subPeriodEndRaw ? new Date(subPeriodEndRaw * 1000).toISOString() : null,
            is_active: subscription.status === 'active',
            suspended_at: subscription.status === 'active' ? null : 'now()'
          })
          .eq('stripe_customer_id', subscription.customer as string)

        if (error) {
          console.error('Error updating subscription status:', error)
          throw error
        }

        console.log('Successfully updated subscription for customer:', subscription.customer)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription deleted:', subscription.id)

        // Update company subscription status
        const { error } = await supabase
          .from('companies')
          .update({
            stripe_status: 'canceled',
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
          throw error
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', invoice.id)

        // Update company subscription status
        if (invoice.subscription) {
          const { error } = await supabase
            .from('companies')
            .update({
              stripe_status: 'past_due'
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (error) {
            console.error('Error updating subscription status after payment failure:', error)
            throw error
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    console.log('Webhook processed successfully')
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Webhook processing failed' }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 
