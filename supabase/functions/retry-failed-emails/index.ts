import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FAILED_STATUSES = ["failed", "dlq"];
const RECOVERY_TEMPLATES = ["recovery", "password_reset"];
const WELCOME_TEMPLATES = ["welcome", "welcome_email"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const allTemplates = [...RECOVERY_TEMPLATES, ...WELCOME_TEMPLATES];

    // Find latest log row per (recipient_email, template-group)
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from("email_send_log")
      .select("recipient_email, template_name, status, created_at")
      .in("template_name", allTemplates)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (logsErr) throw logsErr;

    type Group = "recovery" | "welcome";
    const groupOf = (t: string): Group | null =>
      RECOVERY_TEMPLATES.includes(t) ? "recovery"
        : WELCOME_TEMPLATES.includes(t) ? "welcome"
        : null;

    // Latest status per (email, group)
    const latest = new Map<string, { status: string; recipient: string; group: Group }>();
    for (const row of logs ?? []) {
      const g = groupOf(row.template_name);
      if (!g) continue;
      const key = `${row.recipient_email.toLowerCase()}::${g}`;
      if (!latest.has(key)) {
        latest.set(key, { status: row.status, recipient: row.recipient_email, group: g });
      }
    }

    const toRetry: { recipient: string; group: Group }[] = [];
    for (const v of latest.values()) {
      if (FAILED_STATUSES.includes(v.status)) {
        toRetry.push({ recipient: v.recipient, group: v.group });
      }
    }

    const results: { recipient: string; group: Group; status: string; error?: string }[] = [];
    let retried = 0, failed = 0, skipped = 0;

    // Group welcome retries by tenant lookup
    const welcomeEmails = toRetry.filter(r => r.group === "welcome").map(r => r.recipient);
    const tenantsByEmail = new Map<string, string>();
    if (welcomeEmails.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, contact_email")
        .in("contact_email", welcomeEmails);
      for (const t of tenants ?? []) {
        if (t.contact_email) tenantsByEmail.set(t.contact_email.toLowerCase(), t.id);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    for (const item of toRetry) {
      try {
        if (item.group === "recovery") {
          const res = await fetch(`${supabaseUrl}/functions/v1/request-password-reset`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ email: item.recipient }),
          });
          if (!res.ok) throw new Error(`request-password-reset ${res.status}`);
          retried++;
          results.push({ ...item, status: "retried" });
        } else {
          const tenantId = tenantsByEmail.get(item.recipient.toLowerCase());
          if (!tenantId) {
            skipped++;
            results.push({ ...item, status: "skipped", error: "no tenant for email" });
            continue;
          }
          const res = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader,
            },
            body: JSON.stringify({ tenant_ids: [tenantId] }),
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`send-welcome-email ${res.status}: ${txt}`);
          }
          retried++;
          results.push({ ...item, status: "retried" });
        }
      } catch (e) {
        failed++;
        results.push({ ...item, status: "failed", error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ retried, skipped, failed, total: toRetry.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("retry-failed-emails error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
