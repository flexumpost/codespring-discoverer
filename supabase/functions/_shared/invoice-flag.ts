// Shared logic for the automatic "Ubetalt faktura" flag driven by OfficeRnD
// invoice status. Used by officernd-webhook and sync-officernd-invoices.

import {
  isUnpaidInvoiceStatus,
  normalizeInvoiceStatus,
  type OfficeRndInvoice,
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

/** Store/refresh one invoice row. Returns the previous stored status (if any). */
export async function upsertInvoice(
  supabase: Supa,
  args: {
    invoiceId: string;
    tenantId: string | null;
    memberId: string | null;
    memberEmail: string | null;
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
): Promise<boolean> {
  const { data: rows } = await supabase
    .from("officernd_invoices")
    .select("status")
    .eq("tenant_id", tenantId);

  const shouldFlag = ((rows ?? []) as any[]).some((r) => isUnpaidInvoiceStatus(r.status));

  const { data: tenant } = await supabase
    .from("tenants")
    .select("has_unpaid_invoice")
    .eq("id", tenantId)
    .maybeSingle();

  const before = !!tenant?.has_unpaid_invoice;

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
      note: ctx.note ?? null,
    });
  }

  return shouldFlag;
}
