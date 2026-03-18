import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Verify operator role
    const { data: roleCheck } = await callerClient.rpc("is_operator");
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const search = url.searchParams.get("search") || "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let logsQuery = supabaseAdmin
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      logsQuery = logsQuery.or(`template_name.ilike.%${search}%,recipient_email.ilike.%${search}%`);
    }

    const { data: logs, error: logsErr } = await logsQuery;

    if (logsErr) {
      throw logsErr;
    }

    // Deduplicate by message_id client-side (keep latest per message_id)
    const seen = new Set<string>();
    const deduplicated = [];
    for (const row of logs || []) {
      const key = row.message_id || row.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(row);
      }
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from("email_send_log")
      .select("id", { count: "exact", head: true });

    if (search) {
      countQuery = countQuery.or(`template_name.ilike.%${search}%,recipient_email.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    return new Response(
      JSON.stringify({ logs: deduplicated, total: count || 0 }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("get-email-log error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
