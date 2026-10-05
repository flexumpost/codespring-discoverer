import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/zoho_crm";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await caller.auth.getClaims(authHeader.replace("Bearer ", ""));
  const userId = claims?.claims?.sub as string | undefined;
  if (claimsErr || !userId) return json({ error: "Unauthorized" }, 401);

  let tenantId: string | undefined;
  try {
    tenantId = (await req.json())?.tenant_id;
  } catch { /* ignore */ }
  if (!tenantId || typeof tenantId !== "string" || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    return json({ error: "tenant_id required" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);
  const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "operator").maybeSingle();
  const isOperator = !!roleRow;
  const byTenant = !isOperator;
  const { data: t } = await admin.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!t) return json({ error: "Not found" }, 404);
  if (!isOperator && t.user_id !== userId) {
    const { data: link } = await admin.from("tenant_users").select("id").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (!link) return json({ error: "Forbidden" }, 403);
  }

  // 1) Update Zoho CRM account
  let zohoStatus = "ikke opdateret";
  let zohoError: string | null = null;
  if (byTenant) try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ZOHO = Deno.env.get("ZOHO_CRM_API_KEY");
    if (!LOVABLE_API_KEY || !ZOHO) throw new Error("Zoho CRM er ikke forbundet");
    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": ZOHO,
      "Content-Type": "application/json",
    };
    const name = String(t.company_name).replace(/[(),\\]/g, (c: string) => `\\${c}`);
    const sr = await fetch(
      `${GATEWAY_URL}/Accounts/search?criteria=${encodeURIComponent(`(Account_Name:equals:${name})`)}`,
      { headers },
    );
    if (sr.status === 204) throw new Error(`Ingen konto i Zoho med navnet "${t.company_name}"`);
    if (!sr.ok) throw new Error(`Søgning fejlede [${sr.status}]: ${await sr.text()}`);
    const accounts = (await sr.json())?.data ?? [];
    if (!accounts.length) throw new Error(`Ingen konto i Zoho med navnet "${t.company_name}"`);
    if (accounts.length > 1) throw new Error(`Flere konti i Zoho hedder "${t.company_name}"`);

    const ur = await fetch(`${GATEWAY_URL}/Accounts/${accounts[0].id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        data: [{
          Forsendelse_navn: t.shipping_recipient ?? "",
          Forsendelse_c_o_navn: t.shipping_co ?? "",
          Forsendelse_adresse: t.shipping_address ?? "",
          Forsendelses_adresse_2: t.shipping_address_2 ?? "",
          Forsendelse_postnummer: t.shipping_zip ?? "",
          Forsendelse_by: t.shipping_city ?? "",
          Forsendelse_adresse_2: t.shipping_state ?? "", // "Forsendelse stat"
          Forsendelse_land: t.shipping_country ?? "",
        }],
      }),
    });
    const ub = await ur.text();
    if (!ur.ok) throw new Error(`Opdatering fejlede [${ur.status}]: ${ub}`);
    const code = JSON.parse(ub)?.data?.[0]?.code;
    if (code && code !== "SUCCESS") throw new Error(`Zoho svarede: ${ub}`);
    zohoStatus = "opdateret";
  } catch (e) {
    zohoError = e instanceof Error ? e.message : String(e);
    console.error("Zoho address sync failed:", zohoError);
  }

  const lines = [
    t.shipping_recipient, t.shipping_co ? `c/o ${t.shipping_co}` : null, t.shipping_address,
    t.shipping_address_2, [t.shipping_zip, t.shipping_city].filter(Boolean).join(" "),
    t.shipping_state, t.shipping_country,
  ].filter((l) => l && String(l).trim()).map((l) => esc(String(l)));
  const company = esc(t.company_name ?? "Ukendt lejer");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  async function send(to: string, subject: string, html: string, template: string) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Flexum Coworking <kontakt@flexum.dk>", to: [to], subject, html }),
    });
    const rb = await r.json().catch(() => ({}));
    await admin.from("email_send_log").insert({
      message_id: rb.id || crypto.randomUUID(),
      template_name: template,
      recipient_email: to,
      status: r.ok ? "sent" : "failed",
      error_message: r.ok ? null : JSON.stringify(rb),
      metadata: { tenant_id: tenantId, by_tenant: byTenant, zoho_status: zohoStatus, zoho_error: zohoError },
    });
  }

  // 2) Email tenant (always)
  try {
    let to: string | null = null;
    if (t.user_id) {
      const { data: p } = await admin.from("profiles").select("email").eq("id", t.user_id).maybeSingle();
      to = p?.email ?? null;
    }
    to = to || t.contact_email;
    if (RESEND_API_KEY && to) {
      const html = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#1a1a2e">Din forsendelsesadresse er ændret</h2>
          <p>Forsendelsesadressen for <strong>${company}</strong> er blevet ændret. Fremover sender vi dine breve og pakker til denne adresse:</p>
          <p style="padding:12px 16px;background:#f4f4f5;border-radius:6px">${lines.join("<br>")}</p>
          <p>Er adressen forkert, kan du rette den i din digitale postkasse under "Forsendelsesadresse" eller kontakte os på kontakt@flexum.dk.</p>
          <p>Venlig hilsen<br>Flexum Coworking</p>
        </div>`;
      await send(to, `Ny forsendelsesadresse for ${t.company_name}`, html, "address_change_tenant");
    }
  } catch (e) {
    console.error("Tenant email failed:", e);
  }

  // 3) Email operator (only tenant-made changes)
  if (byTenant) try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#1a1a2e">Ny forsendelsesadresse</h2>
          <p><strong>Lejer:</strong> ${company}</p>
          <p><strong>Ny adresse:</strong><br>${lines.join("<br>")}</p>
          <p><strong>Zoho CRM:</strong> ${zohoError ? `Ikke opdateret – ${esc(zohoError)}. Ret adressen manuelt i Zoho.` : "Adressen er opdateret på kontoen."}</p>
        </div>`;
      await send("kontakt@flexum.dk", `Adresseændring: ${t.company_name}`, html, "address_change_notification");
    }
  } catch (e) {
    console.error("Operator email failed:", e);
  }

  return json({ ok: true, zoho: zohoStatus, zoho_error: zohoError });
});
