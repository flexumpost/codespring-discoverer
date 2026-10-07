import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: emails tenant (+ operator / Zoho sync for tenant-made changes).
 * Pass firstSave when the tenant had no address before — the tenant email is then
 * skipped (it's an initial setup, not an address change).
 */
export function notifyAddressChange(tenantId: string, opts?: { firstSave?: boolean }) {
  supabase.functions
    .invoke("sync-address-to-zoho", { body: { tenant_id: tenantId, first_save: !!opts?.firstSave } })
    .then(({ error }) => {
      if (error) console.error("sync-address-to-zoho failed:", error);
    });
}
