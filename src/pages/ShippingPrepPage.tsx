import { useState, useMemo } from "react";
import { format, nextThursday, isThursday, startOfDay } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, Package, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function getDefaultShippingDate(): Date {
  const now = new Date();
  if (isThursday(now)) return startOfDay(now);
  return startOfDay(nextThursday(now));
}

function getFirstThursdayOfMonth(refDate: Date): Date {
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const dow = first.getDay();
  const offset = (4 - dow + 7) % 7;
  return new Date(refDate.getFullYear(), refDate.getMonth(), 1 + offset);
}

function getNextShippingDateForItem(tenantTypeName: string, mailType: string): Date {
  const now = new Date();
  const today = startOfDay(now);

  if (mailType === "pakke" || tenantTypeName.toLowerCase() !== "lite") {
    // Every Thursday
    if (isThursday(today)) return today;
    return startOfDay(nextThursday(today));
  }

  // Lite letters: first Thursday of the month
  const firstThurs = getFirstThursdayOfMonth(now);
  if (firstThurs >= today) return startOfDay(firstThurs);

  // Already passed → first Thursday of next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return startOfDay(getFirstThursdayOfMonth(nextMonth));
}

type MailItemWithTenant = {
  id: string;
  stamp_number: number | null;
  mail_type: string;
  status: string;
  chosen_action: string | null;
  tenant_id: string;
  company_name: string;
  tenant_type_name: string;
};

export default function ShippingPrepPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultShippingDate);
  const [tab, setTab] = useState<"brev" | "pakke">("brev");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["shipping-prep-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("id, stamp_number, mail_type, status, chosen_action, tenant_id, tenants(company_name, tenant_type_id, tenant_types(name))")
        .eq("chosen_action", "send")
        .not("tenant_id", "is", null)
        .in("status", ["ny", "afventer_handling", "ulaest", "laest"]);

      if (error) throw error;

      return (data ?? []).map((item: any) => ({
        id: item.id,
        stamp_number: item.stamp_number,
        mail_type: item.mail_type,
        status: item.status,
        chosen_action: item.chosen_action,
        tenant_id: item.tenant_id,
        company_name: item.tenants?.company_name ?? "Ukendt",
        tenant_type_name: item.tenants?.tenant_types?.name ?? "Standard",
      })) as MailItemWithTenant[];
    },
  });

  const markShipped = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "arkiveret" as any, chosen_action: "under_forsendelse" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-prep-items"] });
      toast({ title: "Forsendelse markeret som pakket" });
    },
    onError: () => {
      toast({ title: "Fejl", description: "Kunne ikke opdatere forsendelsen", variant: "destructive" });
    },
  });

  const filteredItems = useMemo(() => {
    const selDay = startOfDay(selectedDate).getTime();
    return items.filter((item) => {
      if (item.mail_type !== tab) return false;
      const shipDate = getNextShippingDateForItem(item.tenant_type_name, item.mail_type);
      return shipDate.getTime() === selDay;
    });
  }, [items, selectedDate, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, { companyName: string; items: MailItemWithTenant[] }>();
    for (const item of filteredItems) {
      const key = item.tenant_id;
      if (!map.has(key)) {
        map.set(key, { companyName: item.company_name, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    // Sort groups by company name
    return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [filteredItems]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Send breve og pakker</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Forsendelsesdag:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "EEEE d. MMMM yyyy", { locale: da })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(startOfDay(d))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "brev" | "pakke")}>
          <TabsList>
            <TabsTrigger value="brev" className="gap-2">
              <Mail className="h-4 w-4" />
              Breve
            </TabsTrigger>
            <TabsTrigger value="pakke" className="gap-2">
              <Package className="h-4 w-4" />
              Pakker
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Indlæser...</p>
            ) : grouped.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Ingen {tab === "brev" ? "breve" : "pakker"} til forsendelse på den valgte dag.
                </CardContent>
              </Card>
            ) : (
              grouped.map((group) => (
                <Card key={group.companyName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{group.companyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.items
                      .sort((a, b) => (a.stamp_number ?? 0) - (b.stamp_number ?? 0))
                      .map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            onCheckedChange={(checked) => {
                              if (checked) markShipped.mutate(item.id);
                            }}
                          />
                          <span className="text-sm font-medium">
                            Nr. {item.stamp_number ?? "—"}
                          </span>
                        </label>
                      ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
