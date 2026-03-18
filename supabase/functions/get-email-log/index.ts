import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: operatorRole, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "operator")
      .maybeSingle();

    if (roleErr) throw roleErr;
    if (!operatorRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const search = (url.searchParams.get("search") || "").trim();

    let logsQuery = supabaseAdmin
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      logsQuery = logsQuery.or(`template_name.ilike.%${search}%,recipient_email.ilike.%${search}%`);
    }

    const { data: logs, error: logsErr } = await logsQuery;
    if (logsErr) throw logsErr;

    const seen = new Set<string>();
    const deduplicated: typeof logs = [];
    for (const row of logs || []) {
      const key = row.message_id || row.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(row);
      }
    }

    let countQuery = supabaseAdmin
      .from("email_send_log")
      .select("id", { count: "exact", head: true });

    if (search) {
      countQuery = countQuery.or(`template_name.ilike.%${search}%,recipient_email.ilike.%${search}%`);
    }

    const { count, error: countErr } = await countQuery;
    if (countErr) throw countErr;

    return new Response(JSON.stringify({ logs: deduplicated, total: count || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-email-log error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
