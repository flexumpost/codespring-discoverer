import { useState, useMemo } from "react";
import { format, nextThursday, isThursday, startOfDay } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, Package, Mail, Send, CheckCircle } from "lucide-react";
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
    if (isThursday(today)) return today;
    return startOfDay(nextThursday(today));
  }

  const firstThurs = getFirstThursdayOfMonth(now);
  if (firstThurs >= today) return startOfDay(firstThurs);

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
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [doneGroups, setDoneGroups] = useState<Set<string>>(new Set());
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

  const sendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ chosen_action: "under_forsendelse" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-prep-items"] });
      setCheckedIds(new Set());
      setDoneGroups(new Set());
      toast({ title: "Forsendelser markeret som 'Under forsendelse'" });
    },
    onError: () => {
      toast({ title: "Fejl", description: "Kunne ikke opdatere forsendelserne", variant: "destructive" });
    },
  });

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDoneGroup = (tenantId: string) => {
    setDoneGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  const handleSend = () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) {
      toast({ title: "Ingen forsendelser valgt", description: "Afkryds de forsendelser der skal sendes", variant: "destructive" });
      return;
    }
    sendMutation.mutate(ids);
  };

  const filteredItems = useMemo(() => {
    const selDay = startOfDay(selectedDate).getTime();
    return items.filter((item) => {
      if (item.mail_type !== tab) return false;
      // "Ekstra forsendelse" for Lite-breve: brug førstkommende torsdag
      const isExtraShipment =
        item.chosen_action === "send" &&
        item.tenant_type_name.toLowerCase() === "lite" &&
        item.mail_type === "brev";
      const shipDate = isExtraShipment
        ? (isThursday(startOfDay(new Date())) ? startOfDay(new Date()) : startOfDay(nextThursday(new Date())))
        : getNextShippingDateForItem(item.tenant_type_name, item.mail_type);
      return shipDate.getTime() === selDay;
    });
  }, [items, selectedDate, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, { companyName: string; tenantId: string; items: MailItemWithTenant[] }>();
    for (const item of filteredItems) {
      const key = item.tenant_id;
      if (!map.has(key)) {
        map.set(key, { companyName: item.company_name, tenantId: key, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    const groups = Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
    // Sort: active groups first, done groups last
    return groups.sort((a, b) => {
      const aDone = doneGroups.has(a.tenantId) ? 1 : 0;
      const bDone = doneGroups.has(b.tenantId) ? 1 : 0;
      return aDone - bDone;
    });
  }, [filteredItems, doneGroups]);

  const checkedCount = checkedIds.size;

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
            {!isLoading && grouped.length > 0 && (
              <div className="flex items-center gap-3">
                <Button onClick={handleSend} disabled={checkedCount === 0 || sendMutation.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  Send {checkedCount > 0 ? `(${checkedCount})` : ""}
                </Button>
                {checkedCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {checkedCount} forsendelse{checkedCount !== 1 ? "r" : ""} valgt
                  </span>
                )}
              </div>
            )}

            {isLoading ? (
              <p className="text-muted-foreground text-sm">Indlæser...</p>
            ) : grouped.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Ingen {tab === "brev" ? "breve" : "pakker"} til forsendelse på den valgte dag.
                </CardContent>
              </Card>
            ) : (
              grouped.map((group) => {
                const isDone = doneGroups.has(group.tenantId);
                return (
                  <Card
                    key={group.tenantId}
                    className={cn(isDone && "opacity-50 bg-muted")}
                  >
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base">{group.companyName}</CardTitle>
                      <Button
                        variant={isDone ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleDoneGroup(group.tenantId)}
                      >
                        <CheckCircle className={cn("mr-1 h-4 w-4", isDone && "text-primary")} />
                        Færdig
                      </Button>
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
                              checked={checkedIds.has(item.id)}
                              onCheckedChange={() => toggleCheck(item.id)}
                            />
                            <span className="text-sm font-medium">
                              Nr. {item.stamp_number ?? "—"}
                            </span>
                          </label>
                        ))}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
