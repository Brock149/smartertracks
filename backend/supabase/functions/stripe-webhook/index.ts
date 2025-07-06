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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
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
      return new Response(
        JSON.stringify({ error: 'No stripe signature' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      )
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id)

        // Update company with subscription info
        const { error } = await supabase
          .from('companies')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_status: 'active',
            current_period_end: session.subscription 
              ? new Date((session as any).current_period_end * 1000).toISOString()
              : null
          })
          .eq('id', session.client_reference_id!)

        if (error) {
          console.error('Error updating company after checkout:', error)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)

        // Update company subscription status
        const { error } = await supabase
          .from('companies')
          .update({
            stripe_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
        }
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
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription status:', error)
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
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

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