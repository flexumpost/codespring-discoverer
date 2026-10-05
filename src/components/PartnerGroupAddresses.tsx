import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddressCard } from "@/pages/PartnerAddressesPage";
import { Skeleton } from "@/components/ui/skeleton";

export function PartnerGroupAddresses({ tenantId, ownerId }: { tenantId: string; ownerId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-group", tenantId],
    queryFn: async () => {
      const { data: links } = await supabase.from("tenant_users").select("user_id").eq("tenant_id", tenantId);
      const userIds = [...new Set([ownerId, ...(links ?? []).map((l) => l.user_id)].filter(Boolean))] as string[];
      if (!userIds.length) return [];
      const [{ data: owned }, { data: linked }] = await Promise.all([
        supabase.from("tenants").select("id").in("user_id", userIds),
        supabase.from("tenant_users").select("tenant_id").in("user_id", userIds),
      ]);
      const ids = [...new Set([tenantId, ...(owned ?? []).map((x) => x.id), ...(linked ?? []).map((x) => x.tenant_id)])];
      const { data: tenants } = await supabase.from("tenants").select("*").in("id", ids).order("company_name");
      return tenants ?? [];
    },
  });
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Forsendelsesadresser (samarbejdspartner)</h3>
      {isLoading ? <Skeleton className="h-40" /> : data!.map((x: any) => <AddressCard key={`${x.id}-${x.updated_at}`} tenant={x} />)}
    </div>
  );
}
