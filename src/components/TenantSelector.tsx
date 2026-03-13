import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Mail, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

interface Tenant {
  id: string;
  company_name: string;
  tenant_types?: { name: string } | null;
}

interface TenantSelectorProps {
  tenants: Tenant[];
  selectedTenantId: string | null;
  onSelect: (id: string) => void;
}

export function TenantSelector({ tenants, selectedTenantId, onSelect }: TenantSelectorProps) {
  if (tenants.length === 0) return null;

  const tenantIds = tenants.map((t) => t.id);

  const { data: counts = {} } = useQuery({
    queryKey: ["tenant-mail-counts", tenantIds],
    enabled: tenantIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("tenant_id, status")
        .in("tenant_id", tenantIds)
        .in("status", ["ny", "ulaest"]);
      if (error) throw error;

      const result: Record<string, { ny: number; ulaest: number }> = {};
      for (const id of tenantIds) {
        result[id] = { ny: 0, ulaest: 0 };
      }
      for (const row of data ?? []) {
        if (row.tenant_id && result[row.tenant_id]) {
          if (row.status === "ny") result[row.tenant_id].ny++;
          else if (row.status === "ulaest") result[row.tenant_id].ulaest++;
        }
      }
      return result;
    },
  });

  return (
    <div className="flex flex-wrap gap-3">
      {tenants.map((t) => {
        const isActive = t.id === selectedTenantId;
        const c = counts[t.id] ?? { ny: 0, ulaest: 0 };
        const totalBadge = c.ny + c.ulaest;
        const typeName = (t.tenant_types as any)?.name as string | undefined;

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
              "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className="flex flex-col min-w-0">
              <span className={cn(
                "text-sm font-medium truncate",
                isActive ? "text-primary" : "text-foreground"
              )}>
                {t.company_name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isActive && (
                  <span className="text-[11px] text-muted-foreground">Aktiv</span>
                )}
                {typeName && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 leading-4", TYPE_COLORS[typeName] ?? "")}
                  >
                    {typeName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Notification badges */}
            <div className="flex items-center gap-1.5 ml-auto">
              {c.ny > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                  <Mail className="h-3 w-3" />
                  {c.ny}
                </span>
              )}
              {c.ulaest > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  <ScanLine className="h-3 w-3" />
                  {c.ulaest}
                </span>
              )}
            </div>

            {/* Dot indicator for total when not active */}
            {!isActive && totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {totalBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
