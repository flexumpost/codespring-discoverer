import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget: emails tenant (+ operator / Zoho sync for tenant-made changes). */
export function notifyAddressChange(tenantId: string) {
  supabase.functions
    .invoke("sync-address-to-zoho", { body: { tenant_id: tenantId } })
    .then(({ error }) => {
      if (error) console.error("sync-address-to-zoho failed:", error);
    });
}
