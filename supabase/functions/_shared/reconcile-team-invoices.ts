import { getInvoicePayment, invoiceMemberId, invoiceTeamId, normalizeInvoiceStatus } from "./officernd.ts";
import { recomputeTenantFlag, upsertInvoice } from "./invoice-flag.ts";

/** Refresh company invoices by their own IDs, even without a matching member. */
export async function reconcileTeamInvoices(
  supabase: any,
  apiBase: string,
  token: string,
  onlyTenantId: string | null = null,
): Promise<{ refreshed: number; failed: number }> {
  let refreshed = 0;
  let failed = 0;
  const touched = new Set<string>();
  for (let offset = 0; ; offset += 200) {
    let query = supabase.from("officernd_invoices")
      .select("invoice_id, tenant_id, member_email, team_id")
      .not("team_id", "is", null)
      .order("id")
      .range(offset, offset + 199);
    if (onlyTenantId) query = query.eq("tenant_id", onlyTenantId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const invoices = rows ?? [];
    // Stable paging over all team rows: updating status must not shrink pages.
    for (let start = 0; start < invoices.length; start += 5) {
      await Promise.all(invoices.slice(start, start + 5).map(async (row: any) => {
        try {
          const inv = await getInvoicePayment(apiBase, token, row.invoice_id);
          if (!inv) {
            failed++;
            return; // Never clear debt on an unsuccessful lookup.
          }
          await upsertInvoice(supabase, {
            invoiceId: row.invoice_id,
            tenantId: row.tenant_id,
            memberId: invoiceMemberId(inv),
            memberEmail: row.member_email,
            teamId: invoiceTeamId(inv) ?? row.team_id,
            status: normalizeInvoiceStatus(inv.status),
            amount: inv.total ?? inv.amount ?? null,
            dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
            raw: inv,
          });
          refreshed++;
          if (row.tenant_id) touched.add(row.tenant_id);
        } catch {
          failed++;
          console.warn(`Company invoice refresh failed: ${row.invoice_id}`);
        }
      }));
    }
    if (invoices.length < 200) break;
  }
  for (const tenantId of touched) {
    await recomputeTenantFlag(supabase, tenantId, {
      source: "reconcile",
      note: "Virksomhedsfakturaer afstemt direkte med OfficeRnD",
    });
  }
  return { refreshed, failed };
}