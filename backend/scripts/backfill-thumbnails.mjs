// Run with:
//   $env:SUPABASE_URL="https://<ref>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
//   npm run backfill-thumbnails

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY
const REBUILD = process.env.REBUILD_THUMBS === '1' || process.env.REBUILD_THUMBS === 'true'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY env vars before running.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function run() {
  const query = supabase
    .from('tool_images')
    .select('id, image_url, thumb_url')

  const { data: rows, error } = REBUILD
    ? await query
    : await query.is('thumb_url', null)

  if (error) throw error

  if (!rows || rows.length === 0) {
    console.log('No images to backfill. All good!')
    return
  }

  console.log(`${REBUILD ? 'Rebuilding' : 'Generating'} thumbnails for ${rows.length} images...`)

  for (const row of rows) {
    try {
      const match = row.image_url.match(/tool-images\/(.+)$/)
      if (!match) {
        console.warn(`Skip ${row.id}: unable to parse path from ${row.image_url}`)
        continue
      }
      const filePath = match[1]
      const baseUrl = row.image_url
      const delim = baseUrl.includes('?') ? '&' : '?'
      const transformUrl = `${baseUrl}${delim}width=96&quality=55&format=webp`

      // Fetch transformed bytes
      const resp = await fetch(transformUrl)
      if (!resp.ok) {
        console.warn(`Transform fetch failed for ${row.id}: ${resp.status}`)
        continue
      }
      const arrayBuf = await resp.arrayBuffer()
      const bytes = new Uint8Array(arrayBuf)

      // Upload to thumbs/
      const base = filePath.split('/').pop() || filePath
      const name = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base
      const thumbPath = `thumbs/${name}.webp`

      const { error: upErr } = await supabase.storage
        .from('tool-images')
        .upload(thumbPath, bytes, { contentType: 'image/webp', upsert: true })
      if (upErr) {
        console.warn(`Upload failed for ${row.id}:`, upErr.message || upErr)
        continue
      }

      const { data: pub } = supabase.storage.from('tool-images').getPublicUrl(thumbPath)
      const thumbUrl = pub?.publicUrl
      if (!thumbUrl) {
        console.warn(`Public URL missing for ${row.id}`)
        continue
      }

      const { error: updErr } = await supabase
        .from('tool_images')
        .update({ thumb_url: thumbUrl })
        .eq('id', row.id)
      if (updErr) {
        console.warn(`DB update failed for ${row.id}:`, updErr.message || updErr)
        continue
      }
      console.log(`✓ ${row.id} -> ${thumbUrl}`)
    } catch (e) {
      console.warn(`Error for ${row.id}:`, e?.message || e)
    }
  }

  console.log('Done.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})


