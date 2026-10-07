import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/zoho_crm";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FIELDS = "Account_Name,Forsendelse_navn,Forsendelse_c_o_navn,Forsendelse_adresse,Forsendelses_adresse_2,Forsendelse_postnummer,Forsendelse_by,Forsendelse_adresse_2,Forsendelse_land";
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const formatCo = (v: string | null) => {
  if (!v) return null;
  const n = v.replace(/^c\s*\/\s*o[:\s]*/i, "").trim();
  return n ? `c/o ${n}` : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims } = await caller.auth.getClaims(auth.replace("Bearer ", ""));
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "operator").maybeSingle();
  if (!role) return json({ error: "Forbidden" }, 403);

  let tenantId: string | undefined;
  try { tenantId = (await req.json())?.tenant_id; } catch { /* ignore */ }
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) return json({ error: "tenant_id required" }, 400);

  const { data: t } = await admin.from("tenants").select("id, company_name, contact_email, shipping_address").eq("id", tenantId).maybeSingle();
  if (!t) return json({ error: "Not found" }, 404);

  const log = (success: boolean, action: string, error: string | null, payload?: unknown) =>
    admin.from("zoho_webhook_logs").insert({
      company_name: t.company_name, contact_email: t.contact_email, tenant_id: t.id,
      resolved_action: action, success, error_message: error, payload: payload ?? null,
      address_transfer_status: success ? "hentet fra Zoho" : "ikke hentet",
    });

  if (t.shipping_address) return json({ ok: true, status: "has_address" });

  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    const ZOHO = Deno.env.get("ZOHO_CRM_API_KEY");
    if (!KEY || !ZOHO) throw new Error("Zoho CRM er ikke forbundet");
    const headers = { Authorization: `Bearer ${KEY}`, "X-Connection-Api-Key": ZOHO };
    const name = String(t.company_name).replace(/[(),\\]/g, (c: string) => `\\${c}`);
    const r = await fetch(
      `${GATEWAY_URL}/Accounts/search?criteria=${encodeURIComponent(`(Account_Name:equals:${name})`)}&fields=${FIELDS}`,
      { headers },
    );
    if (r.status === 204) throw new Error(`Ingen konto i Zoho med navnet "${t.company_name}"`);
    if (!r.ok) throw new Error(`Søgning fejlede [${r.status}]: ${await r.text()}`);
    const acc = (await r.json())?.data ?? [];
    if (!acc.length) throw new Error(`Ingen konto i Zoho med navnet "${t.company_name}"`);
    if (acc.length > 1) throw new Error(`Flere konti i Zoho hedder "${t.company_name}"`);
    const a = acc[0];
    const upd = {
      shipping_recipient: s(a.Forsendelse_navn),
      shipping_co: formatCo(s(a.Forsendelse_c_o_navn)),
      shipping_address: s(a.Forsendelse_adresse),
      shipping_address_2: s(a.Forsendelses_adresse_2),
      shipping_zip: s(a.Forsendelse_postnummer),
      shipping_city: s(a.Forsendelse_by),
      shipping_state: s(a.Forsendelse_adresse_2),
      shipping_country: s(a.Forsendelse_land),
    };
    if (!upd.shipping_address) throw new Error("Kontoen i Zoho har ingen forsendelsesadresse");
    const complete = !!(upd.shipping_recipient && upd.shipping_address && upd.shipping_zip && upd.shipping_city && upd.shipping_country);
    const { error } = await admin.from("tenants").update({ ...upd, shipping_confirmed: complete }).eq("id", t.id);
    if (error) throw new Error(error.message);
    await log(true, "adresse hentet ved oprettelse", null, upd);
    return json({ ok: true, status: "fetched", confirmed: complete });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log(false, "adresse ikke hentet ved oprettelse", msg);
    return json({ ok: true, status: "not_found", reason: msg });
  }
});
