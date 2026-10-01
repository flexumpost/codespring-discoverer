// Shared logic for the automatic "Ubetalt faktura" flag driven by OfficeRnD
// invoice status. Used by officernd-webhook and sync-officernd-invoices.

import {
  getTeamById,
  isUnpaidInvoiceStatus,
  normalizeInvoiceStatus,
  teamEmails,
  type OfficeRndInvoice,
  type OfficeRndTeam,
} from "./officernd.ts";

type Supa = any;

/**
 * Resolve which tenant an OfficeRnD member/e-mail belongs to.
 * Mirrors the billing routing used by sync-officernd-charge:
 *  - billed_by_email match wins (invoices paid by another company)
 *  - then contact_email
 *  - then any linked portal user's e-mail
 */
export async function resolveTenantIdsForEmail(
  supabase: Supa,
  email: string | null,
): Promise<string[]> {
  if (!email) return [];
  const lower = email.trim().toLowerCase();
  if (!lower) return [];

  const ids: string[] = [];

  const { data: billed } = await supabase
    .from("tenants")
    .select("id")
    .ilike("billed_by_email", lower);
  for (const r of (billed ?? []) as any[]) if (!ids.includes(r.id)) ids.push(r.id);

  const { data: direct } = await supabase
    .from("tenants")
    .select("id, billed_by_email")
    .ilike("contact_email", lower);
  for (const r of (direct ?? []) as any[]) {
    // A tenant billed by someone else is not matched by its own contact e-mail.
    if (!r.billed_by_email && !ids.includes(r.id)) ids.push(r.id);
  }

  if (ids.length === 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", lower);
    const userIds = ((profs ?? []) as any[]).map((p) => p.id);
    if (userIds.length > 0) {
      const { data: tus } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .in("user_id", userIds);
      for (const r of (tus ?? []) as any[]) {
        if (!ids.includes(r.tenant_id)) ids.push(r.tenant_id);
      }
      const { data: owned } = await supabase
        .from("tenants")
        .select("id")
        .in("user_id", userIds);
      for (const r of (owned ?? []) as any[]) if (!ids.includes(r.id)) ids.push(r.id);
    }
  }

  return ids;
}

/** Match a tenant by company name (used for OfficeRnD team invoices). */
export async function resolveTenantIdsByCompanyName(
  supabase: Supa,
  name: string | null | undefined,
): Promise<string[]> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return [];
  const { data } = await supabase
    .from("tenants")
    .select("id, company_name")
    .ilike("company_name", trimmed);
  return ((data ?? []) as any[]).map((r) => r.id);
}

/**
 * Resolve the tenant for an invoice. Invoices issued to a team (company) have
 * no member, so fall back to the team's e-mails and finally its name.
 */
export async function resolveTenantIdsForInvoice(
  supabase: Supa,
  args: {
    memberEmail: string | null;
    teamId: string | null;
    apiBase?: string | null;
    token?: string | null;
    /** Token with only the companies scope — combined-scope tokens get 401 on /companies. */
    teamToken?: string | null;
  },
): Promise<{ tenantIds: string[]; team: OfficeRndTeam | null; matchedBy: string | null }> {
  const byMember = await resolveTenantIdsForEmail(supabase, args.memberEmail);
  if (byMember.length > 0) return { tenantIds: byMember, team: null, matchedBy: "member_email" };

  let team: OfficeRndTeam | null = null;
  if (args.teamId && args.apiBase && (args.teamToken || args.token)) {
    team = await getTeamById(args.apiBase, (args.teamToken || args.token)!, args.teamId);
  }

  for (const email of teamEmails(team)) {
    const ids = await resolveTenantIdsForEmail(supabase, email);
    if (ids.length > 0) return { tenantIds: ids, team, matchedBy: "team_email" };
  }

  const byName = await resolveTenantIdsByCompanyName(supabase, team?.name as string | undefined);
  if (byName.length > 0) return { tenantIds: byName, team, matchedBy: "team_name" };

  return { tenantIds: [], team, matchedBy: null };
}

/** Store/refresh one invoice row. Returns the previous stored status (if any). */
export async function upsertInvoice(
  supabase: Supa,
  args: {
    invoiceId: string;
    tenantId: string | null;
    memberId: string | null;
    memberEmail: string | null;
    teamId?: string | null;
    status: string;
    amount: number | null;
    dueDate: string | null;
    raw: OfficeRndInvoice | null;
  },
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("officernd_invoices")
    .select("id, status")
    .eq("invoice_id", args.invoiceId)
    .maybeSingle();

  const payload = {
    invoice_id: args.invoiceId,
    tenant_id: args.tenantId,
    member_id: args.memberId,
    member_email: args.memberEmail,
    team_id: args.teamId ?? null,
    status: normalizeInvoiceStatus(args.status),
    amount: args.amount,
    due_date: args.dueDate,
    raw: args.raw as unknown,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("officernd_invoices").update(payload).eq("id", existing.id);
    return existing.status ?? null;
  }
  await supabase.from("officernd_invoices").insert(payload);
  return null;
}

/**
 * Recompute tenants.has_unpaid_invoice from the stored invoices and log the
 * change. Returns the resulting flag value.
 */
export async function recomputeTenantFlag(
  supabase: Supa,
  tenantId: string,
  ctx: {
    invoiceId?: string | null;
    oldStatus?: string | null;
    newStatus?: string | null;
    source: string;
    note?: string | null;
  },
  _depth = 0,
): Promise<boolean> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, company_name, contact_email, billed_by_email, billed_by_company, has_unpaid_invoice")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return false;

  // A tenant billed by another company shares that payer's invoices.
  const payerIds = await findPayerTenantIds(supabase, tenant);
  const invoiceTenantIds = [tenantId, ...payerIds];

  const { data: rows } = await supabase
    .from("officernd_invoices")
    .select("status")
    .in("tenant_id", invoiceTenantIds);

  const shouldFlag = ((rows ?? []) as any[]).some((r) => isUnpaidInvoiceStatus(r.status));

  const before = !!tenant.has_unpaid_invoice;

  if (before !== shouldFlag) {
    await supabase
      .from("tenants")
      .update({ has_unpaid_invoice: shouldFlag })
      .eq("id", tenantId);
  }

  if (before !== shouldFlag || ctx.oldStatus !== ctx.newStatus) {
    await supabase.from("officernd_invoice_log").insert({
      tenant_id: tenantId,
      invoice_id: ctx.invoiceId ?? null,
      old_status: ctx.oldStatus ?? null,
      new_status: ctx.newStatus ?? null,
      flag_before: before,
      flag_after: shouldFlag,
      source: ctx.source,
      note: ctx.note ?? (payerIds.length && _depth > 0 ? "Følger betalende virksomhed" : null),
    });
  }

  // Propagate to tenants that are billed by this tenant (e.g. holding companies).
  if (_depth === 0) {
    for (const depId of await findDependentTenantIds(supabase, tenant)) {
      await recomputeTenantFlag(supabase, depId, { source: ctx.source, note: `Betales af ${tenant.company_name}` }, 1);
    }
  }

  return shouldFlag;
}

/** Tenants that pay for this tenant (billed_by_email / billed_by_company). */
async function findPayerTenantIds(supabase: Supa, t: any): Promise<string[]> {
  const ids = new Set<string>();
  if (t.billed_by_email) {
    const { data } = await supabase.from("tenants").select("id")
      .ilike("contact_email", String(t.billed_by_email).trim()).is("billed_by_email", null);
    for (const r of (data ?? []) as any[]) if (r.id !== t.id) ids.add(r.id);
  }
  if (t.billed_by_company) {
    const { data } = await supabase.from("tenants").select("id")
      .ilike("company_name", String(t.billed_by_company).trim());
    for (const r of (data ?? []) as any[]) if (r.id !== t.id) ids.add(r.id);
  }
  return [...ids];
}

/** Tenants billed by this tenant. */
async function findDependentTenantIds(supabase: Supa, t: any): Promise<string[]> {
  if (t.billed_by_email || t.billed_by_company) return [];
  const ids = new Set<string>();
  if (t.contact_email) {
    const { data } = await supabase.from("tenants").select("id")
      .ilike("billed_by_email", String(t.contact_email).trim());
    for (const r of (data ?? []) as any[]) if (r.id !== t.id) ids.add(r.id);
  }
  if (t.company_name) {
    const { data } = await supabase.from("tenants").select("id")
      .ilike("billed_by_company", String(t.company_name).trim());
    for (const r of (data ?? []) as any[]) if (r.id !== t.id) ids.add(r.id);
  }
  return [...ids];
}
