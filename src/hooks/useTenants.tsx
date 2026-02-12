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
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
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
