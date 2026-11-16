export const isActiveZohoAccount = (account: Record<string, unknown>) =>
  typeof account.Kundeemne_Status === "string" && account.Kundeemne_Status.trim().toLowerCase() === "aktiv adresseservice";

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

export function zohoAccountPayload(a: Record<string, unknown>) {
  return {
    zoho_account_id: text(a.id),
    account_name: text(a.Account_Name),
    contact_email: text(a.Kontaktperson_E_mail)?.toLowerCase() ?? null,
    contact_first_name: text(a.Kontaktperson_fornavn),
    contact_last_name: text(a.Kontaktperson_efternavn),
    contact_phone: text(a.Kontaktperson_telefon),
    kunde_status: text(a.Kundeemne_Status),
    solution_short: text(a.L_sning_kort),
    package_solution: text(a.Adresseservice_pakke),
    shipping_recipient: text(a.Forsendelse_navn),
    shipping_co: text(a.Forsendelse_c_o_navn),
    shipping_address: text(a.Forsendelse_adresse),
    shipping_address_2: text(a.Forsendelses_adresse_2),
    shipping_zip: text(a.Forsendelse_postnummer),
    shipping_city: text(a.Forsendelse_by),
    shipping_state: text(a.Forsendelse_adresse_2),
    shipping_country: text(a.Forsendelse_land),
  };
}

type TenantIdentity = { id: string; company_name: string; zoho_account_id: string | null };
export function matchZohoTenant(tenants: TenantIdentity[], accountId: string, companyName: string) {
  const exact = tenants.find(t => t.zoho_account_id === accountId);
  if (exact) return exact;
  const legacy = tenants.filter(t => !t.zoho_account_id && t.company_name.trim().toLowerCase() === companyName.trim().toLowerCase());
  if (legacy.length > 1) throw new Error(`Flere postkasser har firmanavnet ${companyName}; kræver manuel afklaring`);
  return legacy[0] ?? null;
}