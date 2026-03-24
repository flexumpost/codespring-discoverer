import { useState, useMemo, useCallback } from "react";
import { format, nextThursday, isThursday, startOfDay } from "date-fns";
import { da, enGB } from "date-fns/locale";
import { CalendarIcon, Package, Mail, Send, CheckCircle, Copy, Printer } from "lucide-react";
import { PhotoHoverPreview } from "@/components/PhotoHoverPreview";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EnvelopePrint, type EnvelopeGroup } from "@/components/EnvelopePrint";
import { useTranslation } from "react-i18next";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};
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

const COUNTRY_CODES: Record<string, string> = {
  "danmark": "DK", "denmark": "DK",
  "sverige": "SE", "sweden": "SE",
  "norge": "NO", "norway": "NO",
  "finland": "FI",
  "tyskland": "DE", "germany": "DE",
  "frankrig": "FR", "france": "FR",
  "spanien": "ES", "spain": "ES",
  "italien": "IT", "italy": "IT",
  "holland": "NL", "nederlandene": "NL", "netherlands": "NL",
  "belgien": "BE", "belgium": "BE",
  "østrig": "AT", "austria": "AT",
  "schweiz": "CH", "switzerland": "CH",
  "polen": "PL", "poland": "PL",
  "storbritannien": "GB", "united kingdom": "GB", "uk": "GB",
  "usa": "US", "united states": "US",
  "island": "IS", "iceland": "IS",
  "portugal": "PT",
  "irland": "IE", "ireland": "IE",
  "grækenland": "GR", "greece": "GR",
  "tjekkiet": "CZ", "czech republic": "CZ", "czechia": "CZ",
};

function getCountryCode(country: string | null): string {
  if (!country) return "";
  return COUNTRY_CODES[country.toLowerCase().trim()] ?? "";
}

type MailItemWithTenant = {
  id: string;
  stamp_number: number | null;
  mail_type: string;
  status: string;
  chosen_action: string | null;
  photo_url: string | null;
  tenant_id: string;
  company_name: string;
  tenant_type_name: string;
  has_unpaid_invoice: boolean;
  default_mail_action: string | null;
  default_package_action: string | null;
  shipping_recipient: string | null;
  shipping_co: string | null;
  shipping_address: string | null;
  shipping_zip: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
};

function getShippingFee(item: MailItemWithTenant): string {
  const tier = item.tenant_type_name;
  const defaultAction = item.mail_type === "pakke"
    ? item.default_package_action
    : item.default_mail_action;

  if (!item.chosen_action) {
    if (!defaultAction) return "—";
    if (item.mail_type === "pakke") {
      if (defaultAction === "afhentning") {
        if (tier === "Plus") return "10 kr.";
        if (tier === "Standard") return "30 kr.";
        return "50 kr.";
      }
      if (defaultAction === "send") {
        if (tier === "Plus") return "10 kr. + porto";
        if (tier === "Standard") return "30 kr. + porto";
        return "50 kr. + porto";
      }
      if (defaultAction === "destruer") return "0 kr.";
      return "—";
    }
    return "0 kr.";
  }

  if (item.chosen_action === "standard_forsendelse") {
    if (item.mail_type === "pakke") {
      if (tier === "Plus") return "10 kr. + porto";
      if (tier === "Standard") return "30 kr. + porto";
      return "50 kr. + porto";
    }
    return "0 kr. + porto";
  }
  if (item.chosen_action === "standard_scan") return "0 kr.";
  if (item.chosen_action === "gratis_afhentning") return "0 kr.";
  if (!tier) return "—";

  if (item.mail_type === "pakke") {
    if (item.chosen_action === "destruer") return "0 kr.";
    if (item.chosen_action === "afhentning") {
      if (tier === "Plus") return "10 kr.";
      if (tier === "Standard") return "30 kr.";
      return "50 kr.";
    }
    if (tier === "Plus") return "10 kr. + porto";
    if (tier === "Standard") return "30 kr. + porto";
    return "50 kr. + porto";
  }

  if (item.chosen_action === defaultAction) {
    if (item.chosen_action === "send" || item.chosen_action === "forsendelse") {
      if (tier === "Lite") return "50 kr. + porto";
      if (tier === "Standard") return "0 kr. + porto";
      return "0 kr.";
    }
    if (item.chosen_action === "scan") {
      if (tier === "Plus") return "0 kr.";
      if (tier === "Standard") return "30 kr.";
      return "50 kr.";
    }
    return "0 kr.";
  }

  if (item.chosen_action === "send" || item.chosen_action === "forsendelse") {
    if (tier === "Lite") return "50 kr. + porto";
    if (tier === "Standard") return "0 kr. + porto";
    return "0 kr.";
  }

  if (item.chosen_action === "scan") {
    if (tier === "Plus") return "0 kr.";
    if (tier === "Standard") return "30 kr.";
    return "50 kr.";
  }

  if (item.chosen_action === "afhentning") {
    if (tier === "Plus") return "0 kr.";
    if (tier === "Standard") return "30 kr.";
    return "50 kr.";
  }

  return "0 kr.";
}

export default function ShippingPrepPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "da" ? da : enGB;
  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultShippingDate);
  const [tab, setTab] = useState<"brev" | "pakke">("brev");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [doneGroups, setDoneGroups] = useState<Set<string>>(new Set());
  const [printCheckedGroups, setPrintCheckedGroups] = useState<Set<string>>(new Set());
  const [showPrint, setShowPrint] = useState(false);
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("common.copied"), description: text });
  };
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["shipping-prep-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("id, stamp_number, mail_type, status, chosen_action, tenant_id, photo_url, tenants(company_name, has_unpaid_invoice, default_mail_action, default_package_action, tenant_type_id, tenant_types(name), shipping_recipient, shipping_co, shipping_address, shipping_zip, shipping_city, shipping_state, shipping_country)")
        .not("tenant_id", "is", null)
        .in("status", ["ny", "afventer_handling", "ulaest", "laest"]);

      if (error) throw error;

      return (data ?? []).map((item: any) => ({
        id: item.id,
        stamp_number: item.stamp_number,
        mail_type: item.mail_type,
        status: item.status,
        chosen_action: item.chosen_action,
        photo_url: item.photo_url ?? null,
        tenant_id: item.tenant_id,
        company_name: item.tenants?.company_name ?? t("common.unknown"),
        tenant_type_name: item.tenants?.tenant_types?.name ?? "Standard",
        has_unpaid_invoice: item.tenants?.has_unpaid_invoice ?? false,
        default_mail_action: item.tenants?.default_mail_action ?? null,
        default_package_action: item.tenants?.default_package_action ?? null,
        shipping_recipient: item.tenants?.shipping_recipient ?? null,
        shipping_co: item.tenants?.shipping_co ?? null,
        shipping_address: item.tenants?.shipping_address ?? null,
        shipping_zip: item.tenants?.shipping_zip ?? null,
        shipping_city: item.tenants?.shipping_city ?? null,
        shipping_state: item.tenants?.shipping_state ?? null,
        shipping_country: item.tenants?.shipping_country ?? null,
      })) as MailItemWithTenant[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const sentItems: { id: string; tenant_id: string; mail_type: string; stamp_number: number | null; tracking_number: string | null }[] = [];

      if (tab === "brev") {
        const { error } = await supabase
          .from("mail_items")
          .update({ chosen_action: "under_forsendelse", status: "sendt_med_dao" as const })
          .in("id", ids);
        if (error) throw error;
        for (const id of ids) {
          const item = items.find((i) => i.id === id);
          if (item) sentItems.push({ id, tenant_id: item.tenant_id, mail_type: item.mail_type, stamp_number: item.stamp_number, tracking_number: null });
        }
      } else {
        for (const id of ids) {
          const tn = trackingNumbers[id] || null;
          const { error } = await supabase
            .from("mail_items")
            .update({
              chosen_action: "under_forsendelse",
              status: "sendt_med_postnord" as const,
              tracking_number: tn,
            } as any)
            .eq("id", id);
          if (error) throw error;
          const item = items.find((i) => i.id === id);
          if (item) sentItems.push({ id, tenant_id: item.tenant_id, mail_type: item.mail_type, stamp_number: item.stamp_number, tracking_number: tn });
        }
      }

      for (const si of sentItems) {
        supabase.functions.invoke("send-new-mail-email", {
          body: {
            tenant_id: si.tenant_id,
            mail_type: si.mail_type,
            stamp_number: si.stamp_number,
            tracking_number: si.tracking_number,
            template_slug: "shipment_dispatched",
          },
        }).catch((err) => console.error("Email send error:", err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-prep-items"] });
      setCheckedIds(new Set());
      setDoneGroups(new Set());
      setTrackingNumbers({});
      toast({ title: tab === "brev" ? t("shippingPrep.lettersSentWithDao") : t("shippingPrep.packagesSentWithPostNord") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("shippingPrep.couldNotUpdate"), variant: "destructive" });
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

  const toggleDoneGroup = (groupKey: string) => {
    setDoneGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleSend = () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) {
      toast({ title: t("shippingPrep.noShipmentsSelected"), description: t("shippingPrep.selectShipmentsToSend"), variant: "destructive" });
      return;
    }
    sendMutation.mutate(ids);
  };


  const filteredItems = useMemo(() => {
    const selDay = startOfDay(selectedDate).getTime();
    return items.filter((item) => {
      if (item.mail_type !== tab) return false;

      const effectiveAction = item.chosen_action
        ?? (item.mail_type === "pakke" ? item.default_package_action : item.default_mail_action);
      if (effectiveAction !== "send" && effectiveAction !== "standard_forsendelse") return false;

      if (item.chosen_action === "standard_forsendelse") {
        const shipDate = getNextShippingDateForItem(item.tenant_type_name, item.mail_type);
        return shipDate.getTime() === selDay;
      }
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
    const map = new Map<string, { addressKey: string; companies: { name: string; typeName: string; hasUnpaidInvoice: boolean }[]; shippingRecipient: string | null; shippingCo: string | null; shippingAddress: string | null; shippingZip: string | null; shippingCity: string | null; shippingState: string | null; shippingCountry: string | null; items: MailItemWithTenant[] }>();
    for (const item of filteredItems) {
      const addrKey = [item.shipping_address ?? "", item.shipping_zip ?? "", item.shipping_city ?? ""].join("|").toLowerCase().trim();
      if (!map.has(addrKey)) {
        map.set(addrKey, {
          addressKey: addrKey,
          companies: [],
          shippingRecipient: item.shipping_recipient,
          shippingCo: item.shipping_co,
          shippingAddress: item.shipping_address,
          shippingZip: item.shipping_zip,
          shippingCity: item.shipping_city,
          shippingState: item.shipping_state,
          shippingCountry: item.shipping_country,
          items: [],
        });
      }
      const group = map.get(addrKey)!;
      if (!group.companies.some((c) => c.name === item.company_name)) {
        group.companies.push({ name: item.company_name, typeName: item.tenant_type_name, hasUnpaidInvoice: item.has_unpaid_invoice });
      }
      group.items.push(item);
    }
    const groups = Array.from(map.values()).sort((a, b) => a.companies[0].name.localeCompare(b.companies[0].name));
    return groups.sort((a, b) => {
      const aDone = doneGroups.has(a.addressKey) ? 1 : 0;
      const bDone = doneGroups.has(b.addressKey) ? 1 : 0;
      return aDone - bDone;
    });
  }, [filteredItems, doneGroups]);

  const togglePrintGroup = (key: string) => {
    setPrintCheckedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllPrintGroups = useCallback(() => {
    setPrintCheckedGroups((prev) => {
      if (prev.size === grouped.length && grouped.length > 0) return new Set();
      return new Set(grouped.map((g) => g.addressKey));
    });
  }, [grouped]);

  const handlePrintEnvelopes = () => {
    if (printCheckedGroups.size === 0) {
      toast({ title: t("shippingPrep.noneSelectedForPrint"), description: t("shippingPrep.selectForPrint"), variant: "destructive" });
      return;
    }
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
  };

  const printGroups: EnvelopeGroup[] = useMemo(() => {
    return grouped.filter((g) => printCheckedGroups.has(g.addressKey));
  }, [grouped, printCheckedGroups]);

  const checkedCount = checkedIds.size;
  const allPrintChecked = grouped.length > 0 && printCheckedGroups.size === grouped.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t("shippingPrep.title")}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("shippingPrep.shippingDay")}:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "EEEE d. MMMM yyyy", { locale: dateLocale })}
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
              {t("common.letters")}
            </TabsTrigger>
            <TabsTrigger value="pakke" className="gap-2">
              <Package className="h-4 w-4" />
              {t("common.packages")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {!isLoading && grouped.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allPrintChecked}
                    onCheckedChange={toggleAllPrintGroups}
                  />
                  <span className="text-sm text-muted-foreground">{t("shippingPrep.selectAll")}</span>
                </div>
                <Button variant="outline" onClick={handlePrintEnvelopes} disabled={printCheckedGroups.size === 0}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t("shippingPrep.printEnvelope")} {printCheckedGroups.size > 0 ? `(${printCheckedGroups.size})` : ""}
                </Button>
                <Button onClick={handleSend} disabled={checkedCount === 0 || sendMutation.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {t("shippingPrep.sendCount")} {checkedCount > 0 ? `(${checkedCount})` : ""}
                </Button>
                {checkedCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {checkedCount} {t("shippingPrep.shipmentsSelected", { plural: checkedCount !== 1 ? "r" : "" })}
                  </span>
                )}
              </div>
            )}

            {isLoading ? (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            ) : grouped.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("shippingPrep.noItemsForDay", { type: tab === "brev" ? t("common.letters").toLowerCase() : t("common.packages").toLowerCase() })}
                </CardContent>
              </Card>
            ) : (
              grouped.map((group) => {
                const isDone = doneGroups.has(group.addressKey);
                return (
                  <div key={group.addressKey} className="flex items-start gap-3">
                    <div className="pt-5">
                      <Checkbox
                        checked={printCheckedGroups.has(group.addressKey)}
                        onCheckedChange={() => togglePrintGroup(group.addressKey)}
                      />
                    </div>
                    <Card className={cn("flex-1", isDone && "opacity-50 bg-muted")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          <div className="flex flex-col gap-1">
                            {group.companies.map((c, i) => (
                              <span key={i} className="flex items-center gap-1.5">
                                {c.name}
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] px-1.5 py-0 leading-4", TYPE_COLORS[c.typeName] ?? "")}
                                >
                                  {c.typeName}
                                </Badge>
                                {c.hasUnpaidInvoice && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 leading-4">
                                    {t("shippingPrep.unpaidInvoice")}
                                  </Badge>
                                )}
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(c.name)} />
                              </span>
                            ))}
                          </div>
                        </CardTitle>
                        <Button
                          variant={isDone ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => toggleDoneGroup(group.addressKey)}
                        >
                          <CheckCircle className={cn("mr-1 h-4 w-4", isDone && "text-primary")} />
                          {t("common.done")}
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                        {group.shippingRecipient && (
                          <p className="flex items-center gap-1.5">
                            {group.shippingRecipient}
                            <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(group.shippingRecipient!)} />
                          </p>
                        )}
                        {group.shippingCo && (() => {
                          const formatted = group.shippingCo.match(/^c\/o\s/i) ? group.shippingCo : `c/o ${group.shippingCo}`;
                          return (
                            <p className="flex items-center gap-1.5">
                              {formatted}
                              <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(formatted)} />
                            </p>
                          );
                        })()}
                        {group.shippingAddress && (
                          <p className="flex items-center gap-1.5">
                            {group.shippingAddress}
                            <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(group.shippingAddress!)} />
                          </p>
                        )}
                        {(group.shippingZip || group.shippingCity) && (() => {
                          const cc = getCountryCode(group.shippingCountry);
                          const parts = [cc, "-", group.shippingZip, group.shippingCity].filter(Boolean).join(" ").replace("  ", " ");
                          const copyText = [cc, group.shippingZip, group.shippingCity].filter(Boolean).join(" ");
                          return (
                            <p className="flex items-center gap-1.5">
                              {parts}
                              <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(copyText)} />
                            </p>
                          );
                        })()}
                        {group.shippingState && (
                          <p className="flex items-center gap-1.5">
                            {group.shippingState}
                            <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(group.shippingState!)} />
                          </p>
                        )}
                        {group.shippingCountry && (
                          <p className="flex items-center gap-1.5">
                            {group.shippingCountry}
                            <Copy className="h-3 w-3 hover:text-foreground cursor-pointer shrink-0" onClick={() => copyToClipboard(group.shippingCountry!)} />
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {group.items
                        .sort((a, b) => (a.stamp_number ?? 0) - (b.stamp_number ?? 0))
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              checked={checkedIds.has(item.id)}
                              onCheckedChange={() => toggleCheck(item.id)}
                            />
                            <PhotoHoverPreview photoUrl={item.photo_url} />
                            <span className="text-sm font-medium shrink-0">
                              Nr. {item.stamp_number ?? "—"} — {item.company_name} — {t("common.fee")}: {getShippingFee(item)}
                            </span>
                            {tab === "pakke" && (
                              <Input
                                placeholder={t("shippingPrep.trackAndTrace")}
                                className="ml-auto max-w-[240px] h-8 text-xs"
                                value={trackingNumbers[item.id] ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setTrackingNumbers((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                              />
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
        {showPrint && <EnvelopePrint groups={printGroups} onAfterPrint={() => setShowPrint(false)} />}
      </div>
    </AppLayout>
  );
}
