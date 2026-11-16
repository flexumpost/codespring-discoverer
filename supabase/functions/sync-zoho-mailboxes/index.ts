import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { isActiveZohoAccount, matchZohoTenant, zohoAccountPayload } from "../_shared/zoho-onboarding.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const schema = z.object({ dry_run: z.boolean().default(false), account_id: z.string().regex(/^\d{1,30}$/).optional() }).strict();
// Historical name-only accounts require manual review to avoid recreating renamed mailboxes.
const rolloutStart = "2026-11-10";
const fields = "Created_Time,Account_Name,Kundeemne_Status,Kontaktperson_E_mail,Kontaktperson_fornavn,Kontaktperson_efternavn,Kontaktperson_telefon,L_sning_kort,Adresseservice_pakke,Forsendelse_navn,Forsendelse_c_o_navn,Forsendelse_adresse,Forsendelses_adresse_2,Forsendelse_adresse_2,Forsendelse_postnummer,Forsendelse_by,Forsendelse_land";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Server configuration error" }, 500);
    const admin = createClient(url, serviceKey);
    if (authenticateCronRequest(req)) {
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const caller = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
      const { data, error } = await caller.auth.getClaims(auth.slice(7));
      if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      const { data: role, error: roleError } = await admin.from("user_roles").select("id").eq("user_id", data.claims.sub).eq("role", "operator").maybeSingle();
      if (roleError || !role) return json({ error: "Forbidden" }, 403);
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    const zoho = Deno.env.get("ZOHO_CRM_API_KEY");
    const webhookSecret = Deno.env.get("ZOHO_WEBHOOK_SECRET");
    if (!key || !zoho || !webhookSecret) return json({ error: "Zoho connection is not configured" }, 500);
    const gatewayHeaders = { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": zoho };
    const accounts: Record<string, unknown>[] = [];
    let page = 1;
    while (true) {
      const params = new URLSearchParams({ fields, per_page: "200", page: String(page), criteria: "(Kundeemne_Status:equals:Aktiv adresseservice)" });
      const path = parsed.data.account_id ? `/Accounts/${parsed.data.account_id}` : `/Accounts/search?${params}`;
      const response = await fetch(`https://connector-gateway.lovable.dev/zoho_crm${path}`, { headers: gatewayHeaders });
      if (response.status === 204) break;
      if (!response.ok) return json({ error: "Zoho read failed", status: response.status, details: await response.text() }, response.status);
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error("Invalid Zoho account response");
      accounts.push(...result.data.filter(isActiveZohoAccount));
      if (parsed.data.account_id || !result.info?.more_records) break;
      if (page >= 10) throw new Error("Zoho account search exceeds 2000 records; pagination needs extension");
      page++;
    }
    // Page through all mailbox identities; a truncated list could create duplicates.
    const tenants: { id: string; company_name: string; zoho_account_id: string | null; is_active: boolean; user_id: string | null; welcome_email_sent_at: string | null }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from("tenants").select("id,company_name,zoho_account_id,is_active,user_id,welcome_email_sent_at").order("id").range(offset, offset + 999);
      if (error) throw error;
      tenants.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
    const results: { company_name: string | null; action: string; error?: string }[] = [];
    let work = 0;
    for (const account of accounts) {
      const payload = zohoAccountPayload(account);
      try {
        if (!payload.zoho_account_id || !payload.account_name) throw new Error("Zoho account has no identity/name");
        const match = matchZohoTenant(tenants, payload.zoho_account_id, payload.account_name);
        const tenant = match ? tenants.find(t => t.id === match.id) : null;
        const recent = typeof account.Created_Time === "string" && account.Created_Time.slice(0, 10) >= rolloutStart;
        if (!recent && !tenant?.zoho_account_id && !parsed.data.account_id) {
          results.push({ company_name: payload.account_name, action: "historical_review_required" }); continue;
        }
        if (tenant && !tenant.is_active) { results.push({ company_name: payload.account_name, action: "manual_closure_preserved" }); continue; }
        if (tenant?.user_id) {
          // Existing customers are not re-invited solely because an old welcome timestamp is absent.
          const { data: failed, error } = await admin.from("zoho_webhook_logs").select("welcome_email_status").eq("tenant_id", tenant.id).order("received_at", { ascending: false }).limit(1);
          if (error) throw error;
          if (tenant.welcome_email_sent_at || failed?.[0]?.welcome_email_status !== "fejlet") {
            if (!tenant.zoho_account_id && !parsed.data.dry_run) {
              const { error: bindError } = await admin.from("tenants").update({ zoho_account_id: payload.zoho_account_id }).eq("id", tenant.id).is("zoho_account_id", null);
              if (bindError) throw bindError;
            }
            results.push({ company_name: payload.account_name, action: "existing" }); continue;
          }
        }
        if (!payload.contact_email) throw new Error("Kontakt-e-mail mangler i Zoho");
        if (!payload.solution_short && !payload.package_solution) throw new Error("Løsning mangler i Zoho");
        if (parsed.data.dry_run) { results.push({ company_name: payload.account_name, action: tenant ? "would_retry" : "would_create" }); continue; }
        if (work >= 20) { results.push({ company_name: payload.account_name, action: "deferred" }); continue; }
        work++;
        const response = await fetch(`${url}/functions/v1/zoho-crm-webhook`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-webhook-secret": webhookSecret }, body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Oprettelse fejlede [${response.status}]: ${await response.text()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error ?? "Oprettelse ikke gennemført");
        results.push({ company_name: payload.account_name, action: result.action });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ company_name: payload.account_name, action: "failed", error: message });
        if (!parsed.data.dry_run) await admin.from("zoho_webhook_logs").insert({ company_name: payload.account_name, contact_email: payload.contact_email, raw_status: payload.kunde_status, resolved_action: "automatisk kontrol fejlet", success: false, error_message: message });
      }
    }
    return json({ success: !results.some(r => r.action === "failed"), dry_run: parsed.data.dry_run, checked: accounts.length, results });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 500); }
});