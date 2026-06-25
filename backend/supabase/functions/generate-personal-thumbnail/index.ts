import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-role-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const BUCKET = 'personal-tool-images'

// Generates a small webp thumbnail for a personal tool image and stores the
// thumb_url back on the personal_tool_images row. Mirrors generate-thumbnail
// but is scoped to the personal-tool-images bucket and personal_tool_images
// table, and authorization is by the image owner (owner_id = the caller).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    const svcHeader = req.headers.get('x-service-role-key')
    const serviceKey = Deno.env.get('SERVICE_KEY') ?? ''
    const token = authHeader ? authHeader.replace('Bearer ', '') : ''
    const isServiceBypass = !!svcHeader && svcHeader === serviceKey
    if (!isServiceBypass && !authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { headers: corsHeaders, status: 401 })
    }

    const { image_id } = await req.json()
    if (!image_id) {
      throw new Error('Missing image_id')
    }

    const { data: imgRow, error: imgErr } = await supabase
      .from('personal_tool_images')
      .select('id, image_url, owner_id')
      .eq('id', image_id)
      .single()
    if (imgErr || !imgRow) throw new Error('Image not found')

    if (!isServiceBypass) {
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { headers: corsHeaders, status: 401 })
      }
      // Only the owner of the personal tool image may generate its thumbnail.
      if (user.id !== imgRow.owner_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { headers: corsHeaders, status: 403 })
      }
    }

    const match = imgRow.image_url.match(new RegExp(`${BUCKET}/(.+)$`))
    if (!match) throw new Error('Could not parse image path')
    const file_path = match[1]

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(file_path)
    const publicUrl = pub?.publicUrl
    if (!publicUrl) throw new Error('Could not resolve public URL for original image')

    const transformUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}width=96&quality=50&format=webp`

    const transformedRes = await fetch(transformUrl)
    if (!transformedRes.ok) {
      throw new Error(`Failed to fetch transformed image: ${transformedRes.status}`)
    }
    const arrayBuf = await transformedRes.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)

    // Derive thumbnail path. Keep it next to the owner's folder: <ownerId>/thumbs/<name>.webp
    const parts = file_path.split('/')
    const base = parts.pop() || file_path
    const dir = parts.join('/')
    const name = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base
    const thumbPath = dir ? `${dir}/thumbs/${name}.webp` : `thumbs/${name}.webp`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, bytes, { contentType: 'image/webp', upsert: true })
    if (upErr) throw upErr

    const { data: pubThumb } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath)
    const thumbUrl = pubThumb?.publicUrl
    if (!thumbUrl) throw new Error('Could not resolve thumbnail public URL')

    const { error: updErr } = await supabase
      .from('personal_tool_images')
      .update({ thumb_url: thumbUrl })
      .eq('id', image_id)
    if (updErr) throw updErr

    return new Response(JSON.stringify({ thumb_url: thumbUrl }), { headers: corsHeaders, status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { headers: corsHeaders, status: 400 })
  }
})
