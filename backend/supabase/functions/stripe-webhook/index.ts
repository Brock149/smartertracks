import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { getBillingCycleForPrice, getPlanById, getPlanByStripePriceId } from '../_shared/plans.ts'

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

    const getPlanUpdateForPrice = (priceId: string | null) => {
      const plan = getPlanByStripePriceId(priceId)
      if (!plan) return {}
      const billingCycle = getBillingCycleForPrice(plan, priceId)
      return {
        plan_id: plan.id,
        tier_name: plan.name,
        user_limit: plan.userLimit,
        tool_limit: plan.toolLimit,
        enforcement_mode: plan.enforcementMode,
        billing_cycle: billingCycle,
        trial_expires_at: null,
      }
    }

    const getTrialPlanUpdate = () => {
      const plan = getPlanById('trial')
      if (!plan) return {}
      return {
        plan_id: plan.id,
        tier_name: plan.name,
        user_limit: plan.userLimit,
        tool_limit: plan.toolLimit,
        enforcement_mode: plan.enforcementMode,
        billing_cycle: plan.billingCycle,
        trial_expires_at: null,
      }
    }

    const getCounts = async (companyId: string) => {
      const [{ count: userCount, error: userErr }, { count: toolCount, error: toolErr }] =
        await Promise.all([
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId),
          supabase
            .from('tools')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId),
        ])
      if (userErr) throw userErr
      if (toolErr) throw toolErr
      return { userCount: userCount ?? 0, toolCount: toolCount ?? 0 }
    }

    const isOverLimit = (
      counts: { userCount: number; toolCount: number },
      limits: { user_limit: number | null; tool_limit: number | null }
    ) => {
      if (limits.user_limit != null && counts.userCount > limits.user_limit) return true
      if (limits.tool_limit != null && counts.toolCount > limits.tool_limit) return true
      return false
    }

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
        const priceId = subscriptionData && subscriptionData.items?.data?.length
          ? (subscriptionData.items.data[0].price as Stripe.Price).id
          : null
        const planUpdate = getPlanUpdateForPrice(priceId)

        if (session.client_reference_id) {
          const planLimitsFromPrice = {
            user_limit: (planUpdate as { user_limit?: number | null }).user_limit ?? null,
            tool_limit: (planUpdate as { tool_limit?: number | null }).tool_limit ?? null,
          }
          let shouldSuspend = false
          if (
            planLimitsFromPrice.user_limit != null ||
            planLimitsFromPrice.tool_limit != null
          ) {
            const counts = await getCounts(session.client_reference_id!)
            shouldSuspend = isOverLimit(counts, planLimitsFromPrice)
          }

          const updateData = {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_status: subscriptionData ? subscriptionData.status : 'active',
            stripe_price_id: priceId,
            current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
            is_active: !shouldSuspend,
            suspended_at: shouldSuspend ? new Date().toISOString() : null,
            ...planUpdate,
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

        const metadata = session.metadata || {}
        const companyName = metadata.company_name?.trim()
        const adminName = metadata.admin_name?.trim()
        const adminEmail = metadata.admin_email?.trim()?.toLowerCase()

        if (!companyName || !adminName || !adminEmail) {
          console.warn('Checkout session missing self-serve metadata; skipping company creation')
          break
        }

        const { data: existingCompany, error: existingError } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', session.customer as string)
          .maybeSingle()

        if (existingError) {
          throw existingError
        }

        let companyId = existingCompany?.id ?? null
        if (!companyId) {
          const { data: newCompany, error: createCompanyError } = await supabase
            .from('companies')
            .insert({
              name: companyName,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              stripe_status: subscriptionData ? subscriptionData.status : 'active',
              stripe_price_id: priceId,
              current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
              is_active: true,
              suspended_at: null,
              ...planUpdate,
            })
            .select('id')
            .single()

          if (createCompanyError || !newCompany?.id) {
            throw createCompanyError || new Error('Failed to create company')
          }

          companyId = newCompany.id
        }

        const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          adminEmail,
          { data: { name: adminName } }
        )

        if (inviteError || !invited?.user?.id) {
          throw inviteError || new Error('Failed to invite admin user')
        }

        const adminId = invited.user.id
        const { error: adminInsertError } = await supabase
          .from('users')
          .insert({
            id: adminId,
            name: adminName,
            email: adminEmail,
            role: 'admin',
            company_id: companyId,
          })

        if (adminInsertError) {
          await supabase.auth.admin.deleteUser(adminId)
          throw adminInsertError
        }

        await supabase
          .from('companies')
          .update({ created_by: adminId })
          .eq('id', companyId)

        console.log('Self-serve company created:', companyId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)
        console.log('Customer ID:', subscription.customer)
        console.log('Status:', subscription.status)

        const priceId = subscription.items?.data?.length
          ? (subscription.items.data[0].price as Stripe.Price).id
          : null
        const planUpdate = getPlanUpdateForPrice(priceId)

        const subPeriodEndRaw = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? null
        const { data: companyRow, error: companyErr } = await supabase
          .from('companies')
          .select('id, user_limit, tool_limit')
          .eq('stripe_customer_id', subscription.customer as string)
          .maybeSingle()
        if (companyErr) {
          throw companyErr
        }
        if (!companyRow) {
          console.warn('No company found for customer:', subscription.customer, '— skipping update')
          break
        }

        const limits = {
          user_limit:
            (planUpdate as { user_limit?: number | null }).user_limit ?? companyRow?.user_limit ?? null,
          tool_limit:
            (planUpdate as { tool_limit?: number | null }).tool_limit ?? companyRow?.tool_limit ?? null,
        }
        const counts = await getCounts(companyRow.id)
        const overLimit = isOverLimit(counts, limits)
        const shouldSuspend = subscription.status !== 'active' || overLimit

        const { error } = await supabase
          .from('companies')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            stripe_status: subscription.status,
            current_period_end: subPeriodEndRaw ? new Date(subPeriodEndRaw * 1000).toISOString() : null,
            is_active: !shouldSuspend,
            suspended_at: shouldSuspend ? new Date().toISOString() : null,
            ...planUpdate,
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

        const trialPlanUpdate = getTrialPlanUpdate()
        // Update company subscription status
        const { error } = await supabase
          .from('companies')
          .update({
            stripe_status: 'canceled',
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            is_active: false,
            suspended_at: new Date().toISOString(),
            ...trialPlanUpdate,
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

        const trialPlanUpdate = getTrialPlanUpdate()
        // Update company subscription status
        if (invoice.subscription) {
          const { error } = await supabase
            .from('companies')
            .update({
              stripe_status: 'past_due',
              is_active: false,
              suspended_at: new Date().toISOString(),
              ...trialPlanUpdate,
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
