import { createClient } from '@supabase/supabase-js'

// ────────────────────────────────────────────────────────────────────────────────
// Supabase client
// -----------------------------------------------------------------------------
// We recently migrated to Supabase's new API key system which introduces
// `publishable` (low-privilege) and `secret` (high-privilege) keys.  In order
// to keep local development seamless we still support the legacy
// `VITE_SUPABASE_ANON_KEY` while preferring the new
// `VITE_SUPABASE_PUBLISHABLE_KEY` when it is provided.
//
// The latest @supabase/supabase-js handles these keys automatically.  We add a
// few recommended options (PKCE flow, session persistence, custom headers) so
// that the auth flow works out-of-the-box with the rotated JWT signing keys.
// ────────────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// We *require* the new publishable API key to avoid accidentally sending
// legacy JWT-based keys (which are now disabled).
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables: make sure VITE_SUPABASE_PUBLISHABLE_KEY is set')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Enable PKCE to align with the new Auth v2 recommendations
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'superadmin-portal',
    },
  },
}) 