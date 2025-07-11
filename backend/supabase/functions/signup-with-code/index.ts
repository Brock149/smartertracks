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
    // Get the request body
    const { email, password, name, accessCode } = await req.json();
    
    if (!email || !password || !name || !accessCode) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_KEY')!
    );

    // First validate the access code
    const { data: codeData, error: codeError } = await supabase
      .from('company_access_codes')
      .select('company_id, role')
      .eq('code', accessCode)
      .eq('is_active', true)
      .single();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid access code' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData?.user?.id) {
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user in Auth' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const userId = authData.user.id;

    // Insert user info into users table
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name,
        email,
        role: codeData.role,
        company_id: codeData.company_id,
      });

    if (dbError) {
      // If user creation in the database fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(userId);
      
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userId,
          email,
          name,
          role: codeData.role,
          company_id: codeData.company_id
        }
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
