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
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (token !== SERVICE_ROLE_KEY) return json({ error: "Unauthorized" }, 401);

  let tenantId: string | undefined;
  try {
    tenantId = (await req.json())?.tenant_id;
  } catch { /* ignore */ }
  if (!tenantId || typeof tenantId !== "string") return json({ error: "tenant_id required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);
  const { data: t } = await admin.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!t) return json({ error: "Not found" }, 404);

  // 1) Update Zoho CRM account
  let zohoStatus = "ikke opdateret";
  let zohoError: string | null = null;
  try {
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

  // 2) Email operator
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const lines = [
        t.shipping_recipient, t.shipping_co ? `c/o ${t.shipping_co}` : null, t.shipping_address,
        t.shipping_address_2, [t.shipping_zip, t.shipping_city].filter(Boolean).join(" "),
        t.shipping_state, t.shipping_country,
      ].filter((l) => l && String(l).trim()).map((l) => esc(String(l)));
      const company = esc(t.company_name ?? "Ukendt lejer");
      const html = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#1a1a2e">Ny forsendelsesadresse</h2>
          <p><strong>Lejer:</strong> ${company}</p>
          <p><strong>Ny adresse:</strong><br>${lines.join("<br>")}</p>
          <p><strong>Zoho CRM:</strong> ${zohoError ? `Ikke opdateret – ${esc(zohoError)}. Ret adressen manuelt i Zoho.` : "Adressen er opdateret på kontoen."}</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Flexum Coworking <kontakt@flexum.dk>",
          to: ["kontakt@flexum.dk"],
          subject: `Adresseændring: ${t.company_name}`,
          html,
        }),
      });
      const rb = await r.json().catch(() => ({}));
      await admin.from("email_send_log").insert({
        message_id: rb.id || crypto.randomUUID(),
        template_name: "address_change_notification",
        recipient_email: "kontakt@flexum.dk",
        status: r.ok ? "sent" : "failed",
        error_message: r.ok ? null : JSON.stringify(rb),
        metadata: { tenant_id: tenantId, zoho_status: zohoStatus, zoho_error: zohoError },
      });
    }
  } catch (e) {
    console.error("Operator email failed:", e);
  }

  return json({ ok: true, zoho: zohoStatus, zoho_error: zohoError });
});
