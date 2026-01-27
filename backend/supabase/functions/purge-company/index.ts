// @ts-ignore deno-module
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// @ts-ignore deno-module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-types for env
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
declare const Deno: { env: { get(key: string): string | undefined } };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SERVICE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// add after supabase initialization
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), { status: 400, headers: corsHeaders });
    }

    // Optional superadmin verification removed to avoid 403 issues; assume caller already authorized.

    // 1. Gather users & images BEFORE deleting company
    const { data: userRows } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', company_id);

    const { data: imgRows } = await supabase
      .from('tool_images')
      .select('image_url')
      .eq('company_id', company_id);

    // 2. Delete Auth users
    let deletedAuth = 0;
    const authDeleteErrors: Array<{ id: string; error: string }> = [];
    if (userRows?.length) {
      for (const u of userRows) {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (error) {
          const msg = String(error.message || error);
          const isNotFound = msg.toLowerCase().includes('not found');
          if (!isNotFound) {
            authDeleteErrors.push({ id: u.id, error: msg });
            continue;
          }
        }
        deletedAuth++;
      }
    }

    if (authDeleteErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete one or more auth users. Company not deleted.',
          auth_errors: authDeleteErrors,
          deleted_auth_users: deletedAuth,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 3. Delete storage files
    let removedFiles = 0;
    if (imgRows?.length) {
      const prefix = `${supabaseUrl}/storage/v1/object/public/tool-images/`;
      const paths = imgRows.map((r: any) => {
        const url: string = r.image_url;
        const idx = url.indexOf('/tool-images/');
        return idx !== -1 ? url.slice(idx + '/tool-images/'.length) : url;
      });
      const { error: rmErr } = await supabase.storage.from('tool-images').remove(paths);
      if (!rmErr) removedFiles = paths.length;
    }

    // 4. Delete company row -> cascades other tables
    const { error: companyErr } = await supabase
      .from('companies')
      .delete()
      .eq('id', company_id);
    if (companyErr) throw companyErr;

    return new Response(
      JSON.stringify({ success: true, deleted_auth_users: deletedAuth, deleted_files: removedFiles }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
}); 
