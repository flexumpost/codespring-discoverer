import { describe, expect, it } from "vitest";
import { isActiveZohoAccount, matchZohoTenant, zohoAccountPayload } from "../../supabase/functions/_shared/zoho-onboarding";

describe("Zoho onboarding", () => {
  it("creates from Aktiv adresseservice without a deal", () => {
    expect(isActiveZohoAccount({ Kundeemne_Status: "Aktiv adresseservice" })).toBe(true);
    expect(isActiveZohoAccount({ Kundeemne_Status: "Ansøgning godkendt" })).toBe(false);
    expect(isActiveZohoAccount({})).toBe(false);
  });
  it("maps Hypervisor's Essential solution and shared contact independently of identity", () => {
    expect(zohoAccountPayload({ id: "237372000044144002", Account_Name: "Hypervisor ApS", L_sning_kort: "Essential", Kundeemne_Status: "Aktiv adresseservice" })).toMatchObject({ zoho_account_id: "237372000044144002", account_name: "Hypervisor ApS", solution_short: "Essential", kunde_status: "Aktiv adresseservice" });
  });
  it("uses stable identity after company renaming", () => {
    expect(matchZohoTenant([{ id: "tenant", company_name: "Old", zoho_account_id: "42" }], "42", "New")?.id).toBe("tenant");
  });
  it("refuses ambiguous legacy mailboxes", () => {
    expect(() => matchZohoTenant([{ id: "a", company_name: "Same", zoho_account_id: null }, { id: "b", company_name: "Same", zoho_account_id: null }], "42", "Same")).toThrow();
  });
});