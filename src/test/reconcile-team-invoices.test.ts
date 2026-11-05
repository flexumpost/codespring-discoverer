import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileTeamInvoices } from "../../supabase/functions/_shared/reconcile-team-invoices";
import { getInvoice } from "../../supabase/functions/_shared/officernd";
import { recomputeTenantFlag, upsertInvoice } from "../../supabase/functions/_shared/invoice-flag";

vi.mock("../../supabase/functions/_shared/officernd", () => ({
  getInvoice: vi.fn(), invoiceMemberId: () => null,
  invoiceTeamId: (inv: { team?: string }) => inv.team ?? null,
  normalizeInvoiceStatus: (status: string) => status.toLowerCase(),
}));
vi.mock("../../supabase/functions/_shared/invoice-flag", () => ({
  recomputeTenantFlag: vi.fn(), upsertInvoice: vi.fn(),
}));

function database(rows: unknown[]) {
  const query: any = {};
  for (const name of ["select", "not", "order", "eq"]) query[name] = vi.fn(() => query);
  query.range = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1) }));
  return { from: vi.fn(() => query) };
}

describe("company invoice reconciliation", () => {
  beforeEach(() => vi.clearAllMocks());
  const row = { invoice_id: "17955", tenant_id: "copenhagen", team_id: "company", member_email: null };

  it("refreshes a company-only paid invoice and recomputes the tenant flag", async () => {
    vi.mocked(getInvoice).mockResolvedValue({ id: "17955", team: "company", status: "paid" });
    const result = await reconcileTeamInvoices(database([row]), "api", "token");
    expect(upsertInvoice).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      invoiceId: "17955", tenantId: "copenhagen", memberId: null, teamId: "company", status: "paid",
    }));
    expect(recomputeTenantFlag).toHaveBeenCalledWith(expect.anything(), "copenhagen", expect.anything());
    expect(result).toEqual({ refreshed: 1, failed: 0 });
  });

  it("preserves stored debt when OfficeRnD cannot read the invoice", async () => {
    vi.mocked(getInvoice).mockResolvedValue(null);
    expect(await reconcileTeamInvoices(database([row]), "api", "token")).toEqual({ refreshed: 0, failed: 1 });
    expect(upsertInvoice).not.toHaveBeenCalled();
    expect(recomputeTenantFlag).not.toHaveBeenCalled();
  });

  it("refreshes company invoices beyond the first 200 rows", async () => {
    vi.mocked(getInvoice).mockResolvedValue({ status: "paid" });
    const rows = Array.from({ length: 201 }, (_, i) => ({ ...row, invoice_id: String(i) }));
    expect(await reconcileTeamInvoices(database(rows), "api", "token")).toEqual({ refreshed: 201, failed: 0 });
    expect(getInvoice).toHaveBeenCalledWith("api", "token", "200");
  });
});