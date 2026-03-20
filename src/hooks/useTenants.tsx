import { useState, useMemo, useEffect, createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TenantContextType {
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  return (
    <TenantContext.Provider value={{ selectedTenantId, setSelectedTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ctx = useContext(TenantContext);

  useEffect(() => {
    const channel = supabase
      .channel("tenants-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tenants" },
        () => queryClient.invalidateQueries({ queryKey: ["my-tenants"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fallback local state when used outside provider (e.g. operator pages)
  const [localId, setLocalId] = useState<string | null>(null);
  const selectedTenantId = ctx ? ctx.selectedTenantId : localId;
  const setSelectedTenantId = ctx ? ctx.setSelectedTenantId : setLocalId;

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["my-tenants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: direct, error: e1 } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("user_id", user!.id);
      if (e1) throw e1;

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
