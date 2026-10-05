import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddressCard } from "@/pages/PartnerAddressesPage";
import { Skeleton } from "@/components/ui/skeleton";
import { AutomationCard } from "@/components/AutomationCard";

export function usePartnerGroup(tenantId: string, ownerId: string | null) {
  return useQuery({
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
      const { data: tenants } = await supabase.from("tenants").select("*, tenant_types(name)").in("id", ids).order("company_name");
      return tenants ?? [];
    },
  });
}

export function PartnerGroupAutomation({ tenantId, ownerId }: { tenantId: string; ownerId: string | null }) {
  const { data, isLoading } = usePartnerGroup(tenantId, ownerId);
  if (isLoading) return <Skeleton className="h-40" />;
  return (
    <div className="max-w-5xl space-y-10">
      {data?.map((x: any) => (
        <AutomationCard
          key={`${x.id}-${x.updated_at}`}
          tenantId={x.id}
          title={x.company_name}
          tenantTypeName={x.tenant_types?.name ?? null}
          currentMailAction={x.default_mail_action ?? null}
          currentPackageAction={x.default_package_action ?? null}
          currentMailPickupHour={x.default_mail_pickup_hour ?? null}
          currentPackagePickupHour={x.default_package_pickup_hour ?? null}
          currentMailPickupWeekday={x.default_mail_pickup_weekday ?? 4}
          currentPackagePickupWeekday={x.default_package_pickup_weekday ?? 4}
          invalidateKeys={[["partner-group", tenantId], ["tenant-detail", x.id]]}
        />
      ))}
    </div>
  );
}

export function PartnerGroupAddresses({ tenantId, ownerId }: { tenantId: string; ownerId: string | null }) {
  const { data, isLoading } = usePartnerGroup(tenantId, ownerId);
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Forsendelsesadresser (samarbejdspartner)</h3>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data?.map((x: any) => <AddressCard key={`${x.id}-${x.updated_at}`} tenant={x} />)}
        </div>
      )}
    </div>
  );
}
