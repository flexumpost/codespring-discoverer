// Daily reconciliation of OfficeRnD invoice status -> tenants.has_unpaid_invoice.
// Runs bounded work per invocation and halts on billing/permission errors.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getOfficeRndToken,
  findMembersByEmail,
  INVOICE_SCOPE,
  listInvoices,
  invoiceRefId,
  invoiceMemberId,
  invoiceTeamId,
  normalizeInvoiceStatus,
  TEAM_SCOPE,
  v2Base,
} from "../_shared/officernd.ts";
import {
  recomputeTenantFlag,
  resolveTenantIdsForInvoice,
  upsertInvoice,
} from "../_shared/invoice-flag.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 60; // tenants per invocation

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const onlyTenantId: string | null = body?.tenant_id ?? null;

    const { data: settings } = await supabase
      .from("officernd_settings")
      .select("enabled, org_slug")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ skipped: "officernd disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("OFFICERND_CLIENT_ID");
    const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET");
    const orgSlug = settings.org_slug || Deno.env.get("OFFICERND_ORG_SLUG");
    if (!clientId || !clientSecret || !orgSlug) {
      throw new Error("Missing OfficeRnD credentials");
    }

    let token: string;
    try {
      token = await getOfficeRndToken({ clientId, clientSecret, orgSlug }, [
        INVOICE_SCOPE,
        TEAM_SCOPE,
      ]);
    } catch {
      token = await getOfficeRndToken({ clientId, clientSecret, orgSlug }, [INVOICE_SCOPE]);
    }
    const apiBase = v2Base(orgSlug);

    let q = supabase
      .from("tenants")
      .select("id, company_name, contact_email, billed_by_email, has_unpaid_invoice")
      .eq("is_active", true)
      .order("updated_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (onlyTenantId) q = supabase
      .from("tenants")
      .select("id, company_name, contact_email, billed_by_email, has_unpaid_invoice")
      .eq("id", onlyTenantId);

    const { data: tenants, error: tErr } = await q;
    if (tErr) throw new Error(tErr.message);

    let checked = 0;
    let changed = 0;
    let unresolved = 0;

    for (const tenant of (tenants ?? []) as any[]) {
      const email: string | null = tenant.billed_by_email || tenant.contact_email || null;
      if (!email) {
        unresolved++;
        continue;
      }

      let members: any[] = [];
      try {
        members = await findMembersByEmail(apiBase, token, email);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/\[40[123]\]/.test(msg)) {
          console.error("Halting reconciliation — OfficeRnD auth/permission error:", msg);
          return new Response(
            JSON.stringify({ error: "OfficeRnD auth/permission error", details: msg }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.warn(`Member lookup failed for ${email}: ${msg}`);
        unresolved++;
        continue;
      }

      if (members.length === 0) {
        unresolved++;
        continue;
      }

      const seen: string[] = [];
      for (const member of members) {
        const memberId = member._id ?? member.id;
        if (!memberId) continue;
        let invoices: any[] = [];
        try {
          invoices = await listInvoices(apiBase, token, { member: memberId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/\[40[123]\]/.test(msg)) {
            console.error("Halting reconciliation — invoices endpoint denied:", msg);
            return new Response(
              JSON.stringify({ error: "OfficeRnD invoices access denied", details: msg }),
              { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          console.warn(`Invoice list failed for member ${memberId}: ${msg}`);
          continue;
        }

        for (const inv of invoices) {
          const invoiceId = invoiceRefId(inv);
          if (!invoiceId) continue;
          seen.push(invoiceId);
          await upsertInvoice(supabase, {
            invoiceId,
            tenantId: tenant.id,
            memberId: invoiceMemberId(inv) ?? memberId,
            memberEmail: email,
            teamId: invoiceTeamId(inv),
            status: normalizeInvoiceStatus(inv.status),
            amount: (inv.total ?? inv.amount ?? null) as number | null,
            dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
            raw: inv,
          });
        }
      }

      // Drop stored invoices that no longer exist in OfficeRnD for this tenant.
      const { data: stored } = await supabase
        .from("officernd_invoices")
        .select("id, invoice_id")
        .eq("tenant_id", tenant.id);
      const stale = ((stored ?? []) as any[])
        .filter((r) => !seen.includes(r.invoice_id))
        .map((r) => r.id);
      if (stale.length > 0) {
        await supabase.from("officernd_invoices").delete().in("id", stale);
      }

      const before = !!tenant.has_unpaid_invoice;
      const after = await recomputeTenantFlag(supabase, tenant.id, {
        source: "reconcile",
        note: `Afstemt ${seen.length} faktura(er)`,
      });
      checked++;
      if (before !== after) changed++;
    }

    // --- Re-resolve invoices that could not be linked to a tenant earlier ----
    const { data: orphans } = await supabase
      .from("officernd_invoices")
      .select("id, invoice_id, member_email, team_id, status, raw")
      .is("tenant_id", null)
      .limit(200);

    let relinked = 0;
    const touchedTenants = new Set<string>();

    // Fallback index: OfficeRnD team id -> tenant, built from each tenant's
    // members (their `team` field). Used when the app lacks the teams scope.
    let teamIndex: Map<string, string> | null = null;
    const buildTeamIndex = async (): Promise<Map<string, string>> => {
      const index = new Map<string, string>();
      const { data: all } = await supabase
        .from("tenants")
        .select("id, contact_email, billed_by_email")
        .eq("is_active", true)
        .limit(200);
      for (const t of (all ?? []) as any[]) {
        const mail = t.billed_by_email || t.contact_email;
        if (!mail) continue;
        try {
          const ms = await findMembersByEmail(apiBase, token, mail);
          for (const m of ms) {
            const raw: unknown[] = [
              (m as any).team,
              ...(Array.isArray((m as any).teams) ? (m as any).teams : []),
            ];
            for (const r of raw) {
              const tid = typeof r === "string" ? r : (r as any)?._id ?? (r as any)?.id;
              if (tid && !index.has(tid)) index.set(tid, t.id);
            }
          }
        } catch {
          // ignore lookup failures for the index
        }
      }
      return index;
    };

    for (const row of (orphans ?? []) as any[]) {
      const teamId = row.team_id ?? invoiceTeamId((row.raw ?? {}) as any);
      const { tenantIds } = await resolveTenantIdsForInvoice(supabase, {
        memberEmail: row.member_email ?? null,
        teamId,
        apiBase,
        token,
      });
      let tenantId = tenantIds[0] ?? null;

      if (!tenantId && teamId) {
        if (!teamIndex) teamIndex = await buildTeamIndex();
        tenantId = teamIndex.get(teamId) ?? null;
        if (!tenantId) {
          console.warn(`No tenant found for OfficeRnD team ${teamId} (invoice ${row.invoice_id})`);
        }
      }

      // Always persist the team id so future events can match faster.
      if (teamId && !row.team_id) {
        await supabase.from("officernd_invoices").update({ team_id: teamId }).eq("id", row.id);
      }
      if (!tenantId) continue;
      await supabase
        .from("officernd_invoices")
        .update({ tenant_id: tenantId, team_id: teamId ?? null })
        .eq("id", row.id);
      relinked++;
      touchedTenants.add(tenantId);
    }


    for (const tenantId of touchedTenants) {
      await recomputeTenantFlag(supabase, tenantId, {
        source: "reconcile",
        note: "Faktura koblet til lejer via team",
      });
    }

    console.log(`Relinked ${relinked} orphan invoice(s)`);
    console.log(`Invoice reconciliation done: checked=${checked}, changed=${changed}, unresolved=${unresolved}`);
    return new Response(
      JSON.stringify({ success: true, checked, changed, unresolved, relinked }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-officernd-invoices error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
