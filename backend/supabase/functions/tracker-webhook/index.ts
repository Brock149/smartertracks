import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Test webhook receiver for Digital Matter (Location Engine) GPS trackers.
//
// This is intentionally simple and forgiving: its only job right now is to
// accept whatever the Digital Matter HTTP/S Forwarder POSTs, authenticate it,
// store the raw payload (plus best-effort parsed lat/long) into
// public.tracker_locations, and ALWAYS return 200 so DM doesn't get stuck
// retrying records forever.
//
// Required env / secrets (set with `supabase secrets set ...`):
//   TRACKER_WEBHOOK_TOKEN  - the bearer token you also configure on the DM Forwarder
//   SUPABASE_URL           - provided automatically in deployed functions
//   SERVICE_KEY            - service-role key (same name used by other functions here)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

// --- helpers ---------------------------------------------------------------

// Case-insensitive lookup across a list of candidate keys.
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  const lowerMap = new Map<string, unknown>()
  for (const k of Object.keys(obj)) lowerMap.set(k.toLowerCase(), obj[k])
  for (const k of keys) {
    const v = lowerMap.get(k.toLowerCase())
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function toNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// Digital Matter nests telemetry in an "analogues" array of {id, val}. The
// standard analogue IDs for the Yabby Edge / G-series put battery voltage (mV)
// on id 1. Pull a given analogue id's value out of that array.
function analogue(rec: Record<string, unknown>, id: number): number | null {
  const arr = (rec as any).analogues
  if (!Array.isArray(arr)) return null
  const found = arr.find((a) => a && typeof a === 'object' && Number((a as any).id) === id)
  return found ? toNumber((found as any).val) : null
}

function toIso(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null
  // Unix seconds or millis
  if (typeof v === 'number') {
    const ms = v > 1e12 ? v : v * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Flatten the various shapes DM might send into a flat array of record objects.
function extractRecords(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((r) => r && typeof r === 'object') as Record<string, unknown>[]
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    // Common container keys some forwarders use.
    for (const key of ['records', 'messages', 'data', 'items', 'positions']) {
      const inner = obj[key]
      if (Array.isArray(inner)) {
        return inner.filter((r) => r && typeof r === 'object') as Record<string, unknown>[]
      }
    }
    return [obj]
  }
  return []
}

function parseRecord(rec: Record<string, unknown>) {
  // Digital Matter nests device identity under a "device" object (e.g.
  // {"device":{"sn":"15666666"}}), so build a merged view to look in both.
  const device =
    rec.device && typeof rec.device === 'object'
      ? (rec.device as Record<string, unknown>)
      : {}
  const merged: Record<string, unknown> = { ...device, ...rec }

  const lat = toNumber(pick(merged, ['lat', 'latitude', 'Lat', 'Latitude']))
  const lng = toNumber(
    pick(merged, ['lng', 'long', 'lon', 'longitude', 'Long', 'Lng', 'Longitude'])
  )
  return {
    serial: ((): string | null => {
      const s = pick(merged, [
        'sn',
        'serial',
        'serialNumber',
        'serial_number',
        'deviceSerial',
        'deviceId',
        'device_id',
        'imei',
      ])
      return s === undefined ? null : String(s)
    })(),
    latitude: lat,
    longitude: lng,
    altitude: toNumber(pick(merged, ['alt', 'altitude', 'Altitude'])),
    speed: toNumber(pick(merged, ['spd', 'speed', 'Speed', 'speedKmh'])),
    heading: toNumber(pick(merged, ['head', 'heading', 'Heading', 'course', 'bearing'])),
    // DM sends horizontal accuracy as "posAcc" (metres).
    accuracy: toNumber(pick(merged, ['accuracy', 'hdop', 'Accuracy', 'horizontalAccuracy', 'posAcc'])),
    // Battery: prefer a flat key if present, else DM analogue id 1 (mV) -> volts.
    battery: ((): number | null => {
      const flat = toNumber(pick(merged, ['battery', 'batteryVoltage', 'batt', 'vbatt']))
      if (flat !== null) return flat
      const mv = analogue(rec, 1)
      return mv === null ? null : Math.round((mv / 1000) * 100) / 100
    })(),
    fix_type: ((): string | null => {
      const f = pick(merged, ['fixType', 'fix_type', 'fix', 'lookupType', 'positionType'])
      if (f !== undefined) return String(f)
      // DM Location Engine puts the resolution source under posInfo.Src.
      const posInfo = (rec as any).posInfo
      if (posInfo && typeof posInfo === 'object' && (posInfo as any).Src !== undefined) {
        return `src:${(posInfo as any).Src}`
      }
      return null
    })(),
    recorded_at: toIso(
      pick(merged, ['date', 'timestamp', 'Timestamp', 'recordedAt', 'recorded_at', 'dateUTC', 'gpsTime', 'time'])
    ),
    raw: rec,
  }
}

// --- handler ---------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  // --- auth: bearer token (also accept ?token= and custom header for flexibility) ---
  const expected = Deno.env.get('TRACKER_WEBHOOK_TOKEN') || ''
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''
  const headerToken = req.headers.get('x-tracker-token') || ''
  const urlToken = new URL(req.url).searchParams.get('token') || ''
  const provided = bearer || headerToken || urlToken

  if (!expected) {
    console.error('TRACKER_WEBHOOK_TOKEN is not set; rejecting until configured')
    // 200 so DM test still "passes" loudly in our logs, but we don't store.
    return new Response(JSON.stringify({ ok: false, reason: 'server token not configured' }), {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (provided !== expected) {
    console.warn('Tracker webhook auth failed')
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  // --- parse body ---
  const rawText = await req.text()
  console.log('Tracker webhook received body:', rawText.slice(0, 4000))

  let body: unknown
  try {
    body = rawText ? JSON.parse(rawText) : {}
  } catch (_err) {
    // Not JSON (could be a DM connectivity test). Store raw so we can inspect.
    body = { _nonJsonBody: rawText }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    )

    const records = extractRecords(body)
    const rows = records.map(parseRecord)

    if (rows.length > 0) {
      const { error } = await supabase.from('tracker_locations').insert(rows)
      if (error) {
        // Log but still return 200 so DM doesn't retry forever; we have the
        // raw payload in the logs above for debugging.
        console.error('Failed to insert tracker_locations:', error)
      }
    } else {
      console.warn('No records extracted from payload')
    }

    return new Response(
      JSON.stringify({ ok: true, received: records.length }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('Tracker webhook error:', err)
    // ALWAYS 200 for DM — see module comment.
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: corsHeaders,
    })
  }
})
