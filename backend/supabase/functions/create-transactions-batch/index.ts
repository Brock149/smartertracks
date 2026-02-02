import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChecklistReportInput = {
  tool_id: string
  checklist_item_id: string
  status: string
  comments?: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: any = {}
  let createdTransactions: string[] = []
  let batchId: string | null = null
  const priorOwners = new Map<string, string | null>()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

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

    body = await req.json()
    const {
      tool_ids,
      from_user_id,
      to_user_id,
      location,
      stored_at,
      notes,
      checklist_reports,
    } = body

    if (!Array.isArray(tool_ids) || tool_ids.length === 0 || !to_user_id || !location || !stored_at) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const uniqueToolIds = Array.from(new Set(tool_ids))

    const { data: toolsData, error: toolsError } = await supabase
      .from('tools')
      .select('id, company_id, current_owner')
      .in('id', uniqueToolIds)

    if (toolsError || !toolsData || toolsData.length !== uniqueToolIds.length) {
      return new Response(
        JSON.stringify({ error: 'One or more tools not found' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const invalidTool = toolsData.find((tool) => tool.company_id !== userCompanyId)
    if (invalidTool) {
      return new Response(
        JSON.stringify({ error: 'One or more tools are not in the same company' }),
        { status: 400, headers: corsHeaders }
      )
    }

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

    const { data: normalizedLocationData } = await supabase
      .rpc('normalize_location', {
        p_company_id: userCompanyId,
        p_input_location: location,
      })

    const finalLocation = normalizedLocationData || location

    const { data: batchData, error: batchError } = await supabase
      .from('transaction_batches')
      .insert([{
        company_id: userCompanyId,
        created_by: user.id,
        location: finalLocation,
        stored_at,
        notes,
        from_user_id: from_user_id || null,
        to_user_id,
      }])
      .select()
      .single()

    if (batchError || !batchData) {
      return new Response(
        JSON.stringify({ error: batchError?.message || 'Failed to create batch' }),
        { status: 400, headers: corsHeaders }
      )
    }

    batchId = batchData.id

    for (const tool of toolsData) {
      priorOwners.set(tool.id, tool.current_owner || null)
    }

    const reportsByTool = new Map<string, ChecklistReportInput[]>()
    if (Array.isArray(checklist_reports)) {
      for (const report of checklist_reports as ChecklistReportInput[]) {
        if (!report?.tool_id || !report?.checklist_item_id || !report?.status) continue
        const list = reportsByTool.get(report.tool_id) || []
        list.push(report)
        reportsByTool.set(report.tool_id, list)
      }
    }

    for (const toolId of uniqueToolIds) {
      const fromUserForTool = from_user_id || priorOwners.get(toolId) || null
      const { data: transaction, error: transactionError } = await supabase
        .from('tool_transactions')
        .insert([{
          tool_id: toolId,
          from_user_id: fromUserForTool,
          to_user_id,
          location: finalLocation,
          stored_at,
          notes,
          company_id: userCompanyId,
          timestamp: new Date().toISOString(),
          batch_id: batchId,
        }])
        .select()
        .single()

      if (transactionError || !transaction) {
        throw new Error(transactionError?.message || 'Failed to create transaction')
      }

      createdTransactions.push(transaction.id)

      const reportsForTool = reportsByTool.get(toolId) || []
      if (reportsForTool.length > 0) {
        const { error: reportsError } = await supabase
          .from('checklist_reports')
          .insert(
            reportsForTool.map((report) => ({
              transaction_id: transaction.id,
              checklist_item_id: report.checklist_item_id,
              status: report.status,
              comments: report.comments,
              company_id: userCompanyId,
            }))
          )

        if (reportsError) {
          throw new Error(reportsError.message)
        }
      }

      const { error: updateError } = await supabase
        .from('tools')
        .update({ current_owner: to_user_id })
        .eq('id', toolId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        batch: batchData,
        transactions_created: createdTransactions.length,
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Batch create error:', error)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    if (createdTransactions.length > 0) {
      await supabase
        .from('checklist_reports')
        .delete()
        .in('transaction_id', createdTransactions)

      await supabase
        .from('tool_transactions')
        .delete()
        .in('id', createdTransactions)
    }

    if (priorOwners.size > 0) {
      for (const [toolId, ownerId] of priorOwners.entries()) {
        await supabase
          .from('tools')
          .update({ current_owner: ownerId })
          .eq('id', toolId)
      }
    }

    if (batchId) {
      await supabase
        .from('transaction_batches')
        .delete()
        .eq('id', batchId)
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Batch operation failed' }),
      { status: 400, headers: corsHeaders }
    )
  }
})
