import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useTenants() {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["my-tenants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch directly owned tenants
      const { data: direct, error: e1 } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("user_id", user!.id);
      if (e1) throw e1;

      // Fetch tenants linked via tenant_users
      const { data: linked, error: e2 } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user!.id);
      if (e2) throw e2;

      const linkedIds = (linked || [])
        .map((r: any) => r.tenant_id as string)
        .filter((id) => !(direct || []).some((t: any) => t.id === id));

      let linkedTenants: any[] = [];
      if (linkedIds.length > 0) {
        const { data: lt, error: e3 } = await supabase
          .from("tenants")
          .select("*, tenant_types(name, allowed_actions)")
          .in("id", linkedIds);
        if (e3) throw e3;
        linkedTenants = lt || [];
      }

      const all = [...(direct || []), ...linkedTenants];
      return all.sort((a, b) =>
        a.company_name.localeCompare(b.company_name, "da")
      );
    },
  });

  // Auto-select first tenant when data loads
  const effectiveId = selectedTenantId ?? tenants[0]?.id ?? null;

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === effectiveId) ?? null,
    [tenants, effectiveId],
  );

  return {
    tenants,
    selectedTenant,
    selectedTenantId: effectiveId,
    setSelectedTenantId,
    isLoading,
  };
}
