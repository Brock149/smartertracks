// Usage:
//   npm i -D ts-node @types/node
//   npm i @supabase/supabase-js
//   set SUPABASE_URL=https://xyz.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
//   npx ts-node backend/scripts/backfill-thumbnails.ts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function run() {
  const { data: rows, error } = await supabase
    .from('tool_images')
    .select('id, image_url, thumb_url')
    .is('thumb_url', null)

  if (error) throw error

  if (!rows || rows.length === 0) {
    console.log('No images to backfill. All good!')
    return
  }

  console.log(`Generating thumbnails for ${rows.length} images...`)

  for (const row of rows) {
    const match = row.image_url.match(/tool-images\/([^?]+)/)
    if (!match) {
      console.warn(`Could not parse file path for image ${row.id} (${row.image_url})`)
      continue
    }
    const filePath = match[1]

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ image_id: row.id, file_path: filePath })
    })

    if (!res.ok) {
      const txt = await res.text()
      console.warn(`Failed to gen thumb for ${row.id}: ${res.status} ${txt}`)
      continue
    }
    const json = await res.json()
    console.log(`✓ ${row.id} -> ${json.thumb_url}`)
  }

  console.log('Done.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})


