import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the authorization header - now required
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Get the user's company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    const userCompanyId = userData.company_id

    // Get the request body
    const { 
      tool_id, 
      from_user_id, 
      to_user_id, 
      location, 
      stored_at, 
      notes,
      checklist_reports 
    } = await req.json()

    // Validate required fields
    if (!tool_id || !to_user_id || !location || !stored_at) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the tool belongs to the same company
    const { data: toolData, error: toolError } = await supabase
      .from('tools')
      .select('company_id')
      .eq('id', tool_id)
      .single()

    if (toolError || !toolData || toolData.company_id !== userCompanyId) {
      return new Response(
        JSON.stringify({ error: 'Tool not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the to_user belongs to the same company
    const { data: toUserData, error: toUserError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', to_user_id)
      .single()

    if (toUserError || !toUserData || toUserData.company_id !== userCompanyId) {
      return new Response(
        JSON.stringify({ error: 'Target user not found or not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // If from_user_id is provided, verify they belong to the same company
    if (from_user_id) {
      const { data: fromUserData, error: fromUserError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', from_user_id)
        .single()

      if (fromUserError || !fromUserData || fromUserData.company_id !== userCompanyId) {
        return new Response(
          JSON.stringify({ error: 'Source user not found or not in the same company' }),
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Start a transaction with company_id
    const { data: transaction, error: transactionError } = await supabase
      .from('tool_transactions')
      .insert([{
        tool_id,
        from_user_id,
        to_user_id,
        location,
        stored_at,
        notes,
        company_id: userCompanyId,
        timestamp: new Date().toISOString()
      }])
      .select()
      .single()

    if (transactionError) {
      return new Response(
        JSON.stringify({ error: transactionError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    // If there are checklist reports, insert them with company_id
    if (checklist_reports && checklist_reports.length > 0) {
      const { error: reportsError } = await supabase
        .from('checklist_reports')
        .insert(
          checklist_reports.map((report: any) => ({
            transaction_id: transaction.id,
            checklist_item_id: report.checklist_item_id,
            status: report.status,
            comments: report.comments,
            company_id: userCompanyId
          }))
        )

      if (reportsError) {
        // If checklist reports fail, delete the transaction to maintain consistency
        await supabase
          .from('checklist_reports')
          .delete()
          .eq('transaction_id', transaction.id)
      
        await supabase
          .from('tool_transactions')
          .delete()
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({ error: reportsError.message }),
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Update the tool's current owner
    const { error: updateError } = await supabase
      .from('tools')
      .update({ current_owner: to_user_id })
      .eq('id', tool_id)

    if (updateError) {
      // If tool update fails, delete the transaction and reports to maintain consistency
      await supabase
        .from('checklist_reports')
        .delete()
        .eq('transaction_id', transaction.id)
      
      await supabase
        .from('tool_transactions')
        .delete()
        .eq('id', transaction.id)

      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction 
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    )
  }
}) 