import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No authorization header' }, 401)
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return json({ error: 'Invalid authorization header' }, 401)
    }

    const serviceKey = Deno.env.get('SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!serviceKey || !supabaseUrl) {
      return json({ error: 'Server is missing SERVICE_KEY' }, 500)
    }

    // Pin Authorization to the service role. The edge runtime otherwise
    // forwards the caller's JWT, so the profile insert runs as the admin
    // instead of service_role and can persist the auth user without company_id.
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401)
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, company_id, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return json({ error: 'Only admins can create users' }, 403)
    }

    const adminCompanyId = userData.company_id
    if (!adminCompanyId) {
      return json({ error: 'Your account is not assigned to a company' }, 400)
    }

    const body = await req.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const role = body?.role === 'admin' || body?.role === 'tech' ? body.role : ''

    if (!name || !email || !password || !role) {
      return json({ error: 'Name, email, password, and role are required' }, 400)
    }

    const profile = {
      name,
      email,
      role,
      company_id: adminCompanyId,
    }

    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, company_id: adminCompanyId },
    })

    let userId = authData?.user?.id as string | undefined
    let createdAuthUser = Boolean(userId)

    if (createError || !userId) {
      // A previous attempt often leaves Auth + a users row with a blank
      // company_id. Completing that profile is the same as a successful create.
      const { data: existing } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('email', email)
        .maybeSingle()

      if (!existing?.id || existing.company_id) {
        return json({ error: createError?.message || 'Failed to create user in Auth' }, 400)
      }

      userId = existing.id
      createdAuthUser = false

      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { name, role, company_id: adminCompanyId },
      })
      if (updateAuthError) {
        return json({ error: updateAuthError.message || 'Failed to update existing user' }, 400)
      }
    }

    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile?.company_id && existingProfile.company_id !== adminCompanyId) {
      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(userId)
      }
      return json({ error: 'Email is already in use' }, 400)
    }

    const { error: dbError } = existingProfile
      ? await supabase.from('users').update(profile).eq('id', userId)
      : await supabase.from('users').insert({ id: userId, ...profile })

    if (dbError) {
      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(userId)
      }
      return json({ error: dbError.message }, 400)
    }

    const { data: written, error: verifyError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (verifyError || written?.company_id !== adminCompanyId) {
      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(userId)
      }
      return json({ error: 'Failed to assign company to user' }, 500)
    }

    try {
      await supabase.from('company_events').insert({
        company_id: adminCompanyId,
        event_type: 'user_added',
        actor_id: user.id,
        actor_name: userData.name || user.email || 'An admin',
        target_type: 'user',
        target_id: userId,
        target_label: `${name} (${email})`,
        details: `Added to company as ${role}`,
      })
    } catch (_e) {
      // company_events table not present yet — ignore.
    }

    return json({ success: true, company_id: adminCompanyId })
  } catch (err: any) {
    return json({ error: err.message || 'Unknown error' }, 500)
  }
})
