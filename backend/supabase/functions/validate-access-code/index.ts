import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Get the access code from the request body
    const { accessCode } = await req.json();
    
    if (!accessCode) {
      return new Response(
        JSON.stringify({ error: 'Access code is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query the access code
    const { data, error } = await supabase
      .from('company_access_codes')
      .select('company_id, role')
      .eq('code', accessCode)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Invalid access code' }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        valid: true,
        company_id: data.company_id,
        role: data.role
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}); 