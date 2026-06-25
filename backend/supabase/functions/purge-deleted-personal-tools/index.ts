import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const PERSONAL_BUCKET = 'personal-tool-images'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(new RegExp(`${PERSONAL_BUCKET}/(.+)$`))
  return match ? match[1] : null
}

// Maintenance job: permanently removes any personal tools that were previously
// soft-deleted (is_deleted = true) along with their photo files, image records,
// and lending history. Safe to run repeatedly. Can be triggered two ways:
//   1) The shared CRON secret header (for scheduled/curl maintenance).
//   2) A logged-in superadmin's token (for the Super Admin portal button).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SERVICE_KEY') ?? ''
  )

  const cronSecret = req.headers.get('x-cron-secret') || ''
  const hasValidCronSecret = CRON_SECRET !== '' && cronSecret === CRON_SECRET

  if (!hasValidCronSecret) {
    // Fall back to requiring a superadmin JWT.
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401)
    }
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || (profile as { role: string }).role !== 'superadmin') {
      return json({ error: 'Only superadmins can run this' }, 403)
    }
  }

  const { data: tools, error: toolsError } = await admin
    .from('personal_tools')
    .select('id')
    .eq('is_deleted', true)

  if (toolsError) return json({ error: toolsError.message }, 500)

  const ids = (tools || []).map((t: { id: string }) => t.id)
  if (ids.length === 0) {
    return json({ purged: 0, files_removed: 0, message: 'Nothing to purge.' })
  }

  // Remove the photo files from storage first (this is the real space savings).
  const { data: images } = await admin
    .from('personal_tool_images')
    .select('image_url, thumb_url')
    .in('personal_tool_id', ids)

  const paths: string[] = []
  for (const img of (images || []) as { image_url: string; thumb_url: string | null }[]) {
    const full = storagePathFromUrl(img.image_url)
    if (full) paths.push(full)
    const thumb = storagePathFromUrl(img.thumb_url)
    if (thumb) paths.push(thumb)
  }
  if (paths.length > 0) {
    await admin.storage.from(PERSONAL_BUCKET).remove(paths)
  }

  // Then delete the database rows (service role bypasses RLS).
  await admin.from('personal_tool_transactions').delete().in('personal_tool_id', ids)
  await admin.from('personal_tool_images').delete().in('personal_tool_id', ids)
  const { error: delError } = await admin.from('personal_tools').delete().in('id', ids)
  if (delError) return json({ error: delError.message }, 500)

  return json({ purged: ids.length, files_removed: paths.length })
})
