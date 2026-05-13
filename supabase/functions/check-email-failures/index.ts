import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: isOperator } = await callerClient.rpc("is_operator");
    if (!isOperator) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look at last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("email_send_log")
      .select("recipient_email, template_name, status, error_message, created_at")
      .gte("created_at", since)
      .in("status", ["failed", "dlq"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    // Dedupe by recipient+template (latest only) and exclude if a newer 'sent' exists
    const failures = rows ?? [];
    const recipients = Array.from(new Set(failures.map(r => r.recipient_email)));

    let sentMap = new Map<string, string>(); // key: recipient::template -> latest sent created_at
    if (recipients.length > 0) {
      const { data: sentRows } = await supabaseAdmin
        .from("email_send_log")
        .select("recipient_email, template_name, created_at")
        .gte("created_at", since)
        .eq("status", "sent")
        .in("recipient_email", recipients);
      for (const s of sentRows ?? []) {
        const k = `${s.recipient_email}::${s.template_name}`;
        if (!sentMap.has(k) || new Date(s.created_at) > new Date(sentMap.get(k)!)) {
          sentMap.set(k, s.created_at);
        }
      }
    }

    const seen = new Set<string>();
    const unresolved: typeof failures = [];
    for (const f of failures) {
      const k = `${f.recipient_email}::${f.template_name}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const sentAt = sentMap.get(k);
      if (sentAt && new Date(sentAt) > new Date(f.created_at)) continue;
      unresolved.push(f);
    }

    return new Response(
      JSON.stringify({
        count: unresolved.length,
        latest: unresolved.slice(0, 5),
        since,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
