import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-role-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_KEY') ?? ''
    )
    
    // Authorization: either a user access token OR x-service-role-key (for backfill)
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

    // Fetch image row to get secure source of truth (company_id, file path)
    const { data: imgRow, error: imgErr } = await supabase
      .from('tool_images')
      .select('id, image_url, company_id')
      .eq('id', image_id)
      .single()
    if (imgErr || !imgRow) throw new Error('Image not found')

    if (!isServiceBypass) {
      // Verify user and company match
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { headers: corsHeaders, status: 401 })
      }
      const { data: userData, error: uErr } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (uErr || !userData || userData.company_id !== imgRow.company_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { headers: corsHeaders, status: 403 })
      }
    }

    // Derive file path from stored image_url
    const match = imgRow.image_url.match(/tool-images\/(.+)$/)
    if (!match) throw new Error('Could not parse image path')
    const file_path = match[1]

    // Build transformed URL using Supabase Image Transformations
    const { data: pub } = supabase.storage
      .from('tool-images')
      .getPublicUrl(file_path)

    const publicUrl = pub?.publicUrl
    if (!publicUrl) throw new Error('Could not resolve public URL for original image')

    const transformUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}width=96&quality=50&format=webp`

    // Fetch transformed image bytes
    const transformedRes = await fetch(transformUrl)
    if (!transformedRes.ok) {
      throw new Error(`Failed to fetch transformed image: ${transformedRes.status}`)
    }
    const arrayBuf = await transformedRes.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)

    // Derive thumbnail path: thumbs/<basename>.webp
    const base = file_path.split('/').pop() || file_path
    const name = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base
    const thumbPath = `thumbs/${name}.webp`

    // Upload thumbnail
    const { error: upErr } = await supabase.storage
      .from('tool-images')
      .upload(thumbPath, bytes, { contentType: 'image/webp', upsert: true })
    if (upErr) throw upErr

    // Get public URL of thumbnail
    const { data: pubThumb } = supabase.storage
      .from('tool-images')
      .getPublicUrl(thumbPath)
    const thumbUrl = pubThumb?.publicUrl
    if (!thumbUrl) throw new Error('Could not resolve thumbnail public URL')

    // Update DB row with thumb_url
    const { error: updErr } = await supabase
      .from('tool_images')
      .update({ thumb_url: thumbUrl })
      .eq('id', image_id)
    if (updErr) throw updErr

    return new Response(JSON.stringify({ thumb_url: thumbUrl }), { headers: corsHeaders, status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { headers: corsHeaders, status: 400 })
  }
})


