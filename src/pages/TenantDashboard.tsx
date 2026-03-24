import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenants } from "@/hooks/useTenants";
import { TenantSelector } from "@/components/TenantSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Mail, Archive, ImageIcon, ScanLine, Download, CalendarIcon, FileCheck, Undo2, MessageSquare, ExternalLink, Inbox, MessageCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMailRowColor } from "@/lib/mailRowColor";
import { ScanThumbnail } from "@/components/ScanThumbnail";
import { PhotoHoverPreview } from "@/components/PhotoHoverPreview";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DefaultActionSetup } from "@/components/DefaultActionSetup";
import { MailItemLogSheet } from "@/components/MailItemLogSheet";
import type { Database } from "@/integrations/supabase/types";
import type { TFunction } from "i18next";

type MailStatus = Database["public"]["Enums"]["mail_status"];
type MailItem = Database["public"]["Tables"]["mail_items"]["Row"];

function getStatusLabels(t: TFunction): Record<MailStatus, string> {
  return {
    ny: t("status.ny"),
    afventer_handling: t("status.afventer_handling"),
    ulaest: t("status.ulaest"),
    laest: t("status.laest"),
    arkiveret: t("status.arkiveret"),
    sendt_med_dao: t("status.sendt_med_dao"),
    sendt_med_postnord: t("status.sendt_med_postnord"),
    sendt_retur: t("status.sendt_retur"),
  };
}

function getActionLabelsMap(t: TFunction): Record<string, string> {
  return {
    scan: t("actions.scan"),
    send: t("actions.send"),
    afhentning: t("actions.afhentning"),
    gratis_afhentning: t("actions.gratis_afhentning"),
    destruer: t("actions.destruer"),
    daglig: t("actions.daglig"),
    anden_afhentningsdag: t("actions.anden_afhentningsdag"),
    standard_forsendelse: t("actions.standard_forsendelse"),
    standard_scan: t("actions.standard_scan"),
  };
}

/** Returns the extra actions available for a given tier, mail type and current effective action */
function getExtraActions(tenantTypeName: string | undefined, mailType: string, currentAction?: string | null, defaultPkgAction?: string | null): string[] {
  const addDestruer = (actions: string[]) => {
    if (currentAction === "destruer") return actions;
    return [...actions, "destruer"];
  };
  if (mailType === "pakke") {
    if (tenantTypeName === "Plus") {
      if (currentAction === "afhentning") {
        return addDestruer(["anden_afhentningsdag", "send"]);
      }
      return addDestruer(["afhentning", "send"].filter(a => a !== currentAction));
    }
    if (tenantTypeName === "Lite") {
      if (currentAction === "standard_afhentning") {
        return addDestruer(["afhentning", "standard_forsendelse"]);
      }
      return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
    }
    if (tenantTypeName === "Standard") {
      if (currentAction === "standard_afhentning" || currentAction === "standard_forsendelse") {
        return addDestruer(["afhentning", "send"]);
      }
      return addDestruer(["afhentning", "send"].filter(a => a !== currentAction));
    }
    return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
  }
  if (tenantTypeName === "Plus") {
    switch (currentAction) {
      case "afhentning": return addDestruer(["scan", "send", "anden_afhentningsdag"]);
      case "scan":       return addDestruer(["send", "afhentning"]);
      case "send":       return addDestruer(["scan", "afhentning"]);
      default:           return addDestruer(["scan", "afhentning", "send"]);
    }
  }
  if (tenantTypeName === "Standard") {
    switch (currentAction) {
      case "afhentning": return addDestruer(["scan", "standard_scan", "send", "anden_afhentningsdag"]);
      case "scan":       return addDestruer(["standard_scan", "send", "afhentning"]);
      case "standard_scan": return addDestruer(["scan", "send", "afhentning"]);
      case "send":       return addDestruer(["afhentning", "anden_afhentningsdag", "standard_scan", "scan"]);
      default:           return addDestruer(["scan", "standard_scan", "afhentning", "send"]);
    }
  }
  if (tenantTypeName === "Lite") {
    switch (currentAction) {
      case "afhentning": return addDestruer(["gratis_afhentning", "standard_forsendelse", "send", "standard_scan", "scan"]);
      case "gratis_afhentning": return addDestruer(["afhentning", "standard_forsendelse", "send", "standard_scan", "scan"]);
      case "scan":       return addDestruer(["gratis_afhentning", "afhentning", "standard_forsendelse", "send", "standard_scan"]);
      case "standard_scan": return addDestruer(["gratis_afhentning", "afhentning", "standard_forsendelse", "send", "scan"]);
      case "send":       return addDestruer(["gratis_afhentning", "afhentning", "standard_forsendelse", "standard_scan", "scan"]);
      case "standard_forsendelse": return addDestruer(["gratis_afhentning", "afhentning", "send", "standard_scan", "scan"]);
      default:           return addDestruer(["gratis_afhentning", "afhentning", "standard_forsendelse", "send", "standard_scan", "scan"]);
    }
  }
  return [];
}

/** Returns a tenant-type-specific label for an action */
function getActionLabel(action: string, tenantTypeName: string | undefined, t: TFunction): string {
  if (tenantTypeName === "Lite") {
    const key = `actionLabels.lite.${action}`;
    const val = t(key);
    if (val !== key) return val;
  }
  if (tenantTypeName === "Standard") {
    const key = `actionLabels.standard.${action}`;
    const val = t(key);
    if (val !== key) return val;
  }
  const actionLabels = getActionLabelsMap(t);
  return actionLabels[action] ?? action;
}

/** Parse a pickup date from the dedicated column or legacy notes field */
function parsePickupDate(pickupDate: string | null, notes: string | null): Date | null {
  if (pickupDate) {
    const d = new Date(pickupDate);
    return isNaN(d.getTime()) ? null : d;
  }
  if (notes && notes.startsWith("PICKUP:")) {
    const d = new Date(notes.replace("PICKUP:", ""));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Check if a pickup date falls on a "free Thursday" for the given tier */
function isFreeTorsdag(date: Date, tenantTypeName: string | undefined): boolean {
  if (date.getDay() !== 4) return false;
  if (tenantTypeName === "Standard") return true;
  if (tenantTypeName === "Lite") {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const dow = first.getDay();
    const offset = (4 - dow + 7) % 7;
    const firstThursday = new Date(date.getFullYear(), date.getMonth(), 1 + offset);
    return date.getDate() === firstThursday.getDate();
  }
  return false;
}

/** Returns the fee string for a specific mail item */
function getItemFee(
  tenantTypeName: string | undefined,
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  pickupDateStr: string | null,
  notes: string | null,
  t: TFunction
): string {
  const kr = (n: number) => t("tenantDashboard.krUnit", { count: n });
  const krPorto = (n: number) => `${n} kr. + porto`;

  if (mailType === "pakke" && (tenantTypeName === "Lite" || tenantTypeName === "Standard" || tenantTypeName === "Plus")) {
    const prices: Record<string, { fee: string; feePorto: string }> = {
      Lite: { fee: "50 kr.", feePorto: "50 kr. + porto" },
      Standard: { fee: "30 kr.", feePorto: "30 kr. + porto" },
      Plus: { fee: "10 kr.", feePorto: "10 kr. + porto" },
    };
    const p = prices[tenantTypeName!];
    const effective = chosenAction || defaultAction;
    if (effective === "destruer") return "0 kr.";
    if (effective === "send" || effective === "standard_forsendelse") return p.feePorto;
    if (effective === "afhentning" || effective === "anden_afhentningsdag") return p.fee;
    return p.feePorto;
  }

  if (!chosenAction || (chosenAction === defaultAction &&
    !(chosenAction === "scan" && defaultAction === "scan" && (tenantTypeName === "Lite" || tenantTypeName === "Standard")) &&
    !(chosenAction === "send" && defaultAction === "send" && tenantTypeName === "Lite"))) {
    if (chosenAction === "afhentning" && tenantTypeName !== "Plus") {
      const pd = parsePickupDate(pickupDateStr, notes);
      if (pd && !isFreeTorsdag(pd, tenantTypeName)) {
        return tenantTypeName === "Standard" ? "30 kr." : "50 kr.";
      }
    }
    if ((chosenAction || defaultAction) === "send") {
      if (tenantTypeName === "Plus") return "0 kr.";
      return "0 kr. + porto";
    }
    return "0 kr.";
  }
  if (tenantTypeName === "Plus") {
    return "0 kr.";
  }
  if (chosenAction === "standard_forsendelse") return "0 kr. + porto";
  if (chosenAction === "standard_scan") return "0 kr.";
  if (chosenAction === "gratis_afhentning") return "0 kr.";
  const extraPrice = tenantTypeName === "Lite" ? "50 kr." : "30 kr.";
  if (chosenAction === "scan") return extraPrice;
  if (chosenAction === "send") {
    if (tenantTypeName === "Standard") return "0 kr. + porto";
    return extraPrice + " + porto";
  }
  if (chosenAction === "afhentning") {
    const pd = parsePickupDate(pickupDateStr, notes);
    if (pd && isFreeTorsdag(pd, tenantTypeName)) return "0 kr.";
    return tenantTypeName === "Standard" ? "30 kr." : extraPrice;
  }
  return "—";
}

/** Returns the price label for an action in the dropdown */
function getActionPrice(action: string, tenantTypeName: string | undefined, mailType?: string): string {
  if (action === "destruer") return "0 kr.";
  if (mailType === "pakke" && (tenantTypeName === "Lite" || tenantTypeName === "Standard" || tenantTypeName === "Plus")) {
    const prices: Record<string, { fee: string; feePorto: string }> = {
      Lite: { fee: "50 kr.", feePorto: "50 kr. + porto" },
      Standard: { fee: "30 kr.", feePorto: "30 kr. + porto" },
      Plus: { fee: "10 kr.", feePorto: "10 kr. + porto" },
    };
    const p = prices[tenantTypeName!];
    if (action === "send" || action === "standard_forsendelse") return p.feePorto;
    if (action === "afhentning" || action === "anden_afhentningsdag") return p.fee;
    return p.feePorto;
  }
  if (tenantTypeName === "Plus") {
    return "0 kr.";
  }
  if (tenantTypeName === "Lite") {
    if (action === "gratis_afhentning") return "0 kr.";
    if (action === "scan") return "50 kr.";
    if (action === "standard_scan") return "0 kr.";
    if (action === "send") return "50 kr. + porto";
    if (action === "standard_forsendelse") return "0 kr. + porto";
    if (action === "afhentning" || action === "anden_afhentningsdag") return "50 kr.";
  }
  if (tenantTypeName === "Standard") {
    if (action === "scan") return "30 kr.";
    if (action === "standard_scan") return "0 kr.";
    if (action === "send") return "0 kr. + porto";
    if (action === "afhentning") return "0 kr.";
    if (action === "anden_afhentningsdag") return "30 kr.";
  }
  return "";
}

type FilterStatus = "ny" | "afventer_scanning" | "scannet" | "arkiveret" | null;

/* ── Date helpers ── */

function formatI18nDate(date: Date, t: TFunction): string {
  const days = t("dates.days", { returnObjects: true }) as unknown as string[];
  const months = t("dates.months", { returnObjects: true }) as unknown as string[];
  const day = days[date.getDay()];
  const d = date.getDate();
  const month = months[date.getMonth()];
  const the = t("dates.the");
  return the ? `${day} ${the} ${d}. ${month}` : `${day} ${d}. ${month}`;
}

/** First Thursday of this month (or next month if already passed) */
function getFirstThursdayOfMonth(): Date {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfWeek = first.getDay();
  const offset = (4 - dayOfWeek + 7) % 7;
  const firstThursday = new Date(now.getFullYear(), now.getMonth(), 1 + offset);
  if (firstThursday <= now) {
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    const nextFirst = new Date(year, month, 1);
    const nextDow = nextFirst.getDay();
    const nextOffset = (4 - nextDow + 7) % 7;
    return new Date(year, month, 1 + nextOffset);
  }
  return firstThursday;
}

/** The upcoming Thursday (if today is Thursday, return next Thursday) */
function getNextThursday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntil = (4 - dayOfWeek + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function getNextShippingDate(tenantType: string | undefined, mailType: string): Date {
  if (tenantType === "Lite") {
    if (mailType === "pakke") return getNextThursday();
    return getFirstThursdayOfMonth();
  }
  return getNextThursday();
}

/* ── Pickup helpers ── */

function formatPickupDisplay(pickupDateStr: string | null, notes: string | null, t: TFunction): string | null {
  const date = parsePickupDate(pickupDateStr, notes);
  if (!date) return null;
  const days = t("dates.days", { returnObjects: true }) as unknown as string[];
  const months = t("dates.months", { returnObjects: true }) as unknown as string[];
  const dayName = days[date.getDay()];
  const d = date.getDate();
  const month = months[date.getMonth()];
  const the = t("dates.the");
  const at = t("dates.at");
  const hour = date.getHours();
  if (hour === 0) {
    return the ? `${dayName} ${the} ${d}. ${month}` : `${dayName} ${d}. ${month}`;
  }
  const prefix = the ? `${dayName} ${the} ${d}. ${month}` : `${dayName} ${d}. ${month}`;
  return `${prefix} ${at} ${hour.toString().padStart(2, "0")}:00-${(hour + 1).toString().padStart(2, "0")}:00`;
}

function getDaysLeftForScan(scannedAt: string | null): number | null {
  if (!scannedAt) return null;
  const scannedDate = new Date(scannedAt);
  const now = new Date();
  const diffMs = now.getTime() - scannedDate.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysSince);
}

function formatDateWithMonth(date: Date, t: TFunction): string {
  const months = t("dates.months", { returnObjects: true }) as unknown as string[];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

function formatDateTimeWithMonth(date: Date, t: TFunction): string {
  const months = t("dates.months", { returnObjects: true }) as unknown as string[];
  const at = t("dates.at");
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `${date.getDate()}. ${months[date.getMonth()]} ${at} ${hours}:${mins}`;
}

function getStatusDisplay(
  item: { chosen_action: string | null; scan_url: string | null; status: string; mail_type: string; notes: string | null; pickup_date?: string | null; scanned_at?: string | null; action_rejected_reason?: string | null },
  tenantTypeName: string | undefined,
  t: TFunction,
  defaultMailAction?: string | null,
  defaultPackageAction?: string | null
): [string, string?] {
  if (item.chosen_action === "afhentet" && item.status === "arkiveret") {
    const d = new Date((item as any).updated_at ?? Date.now());
    return [`${t("statusDisplay.pickedUp")} ${formatDateTimeWithMonth(d, t)}`];
  }
  if (item.status === "sendt_med_dao") {
    const d = new Date((item as any).updated_at ?? Date.now());
    return [`${t("statusDisplay.sentWithDao")} ${formatDateWithMonth(d, t)}`];
  }
  if (item.status === "sendt_med_postnord") {
    const d = new Date((item as any).updated_at ?? Date.now());
    return [`${t("statusDisplay.sentWithPostNord")} ${formatDateWithMonth(d, t)}`];
  }
  if (item.status === "sendt_retur") {
    const d = new Date((item as any).updated_at ?? Date.now());
    return [`${t("statusDisplay.sentReturn")} ${formatDateWithMonth(d, t)}`];
  }
  if ((item as any).action_rejected_reason && !item.chosen_action) {
    return [t("statusDisplay.actionRejected")];
  }
  if (item.chosen_action === "scan" && !item.scan_url) {
    return [t("statusDisplay.awaitingScan"), t("statusDisplay.scannedWithin24h")];
  }
  if (item.chosen_action === "scan" && item.scan_url) {
    const daysLeft = getDaysLeftForScan(item.scanned_at ?? null);
    if (daysLeft !== null && daysLeft <= 0) {
      return [t("statusDisplay.letterDestroyed")];
    }
    const statusLabel = item.status === "ulaest" ? t("statusDisplay.unread") : item.status === "laest" ? t("statusDisplay.read") : t("statusDisplay.scanned");
    const subtitle = daysLeft !== null ? t("statusDisplay.physicalLetterKept", { days: daysLeft }) : undefined;
    return [statusLabel, subtitle];
  }
  if (item.chosen_action === "standard_forsendelse") {
    if (item.mail_type === "pakke") {
      const nextDate = getNextThursday();
      return [t("statusDisplay.sentLatest"), formatI18nDate(nextDate, t)];
    }
    const nextDate = getFirstThursdayOfMonth();
    return [t("statusDisplay.sentOn"), formatI18nDate(nextDate, t)];
  }
  if (item.chosen_action === "standard_scan") {
    const nextDate = tenantTypeName === "Lite" ? getFirstThursdayOfMonth() : getNextThursday();
    return [t("statusDisplay.scanScheduled"), formatI18nDate(nextDate, t)];
  }
  if (item.chosen_action === "send") {
    const nextDate = getNextThursday();
    const label = item.mail_type === "pakke" ? t("statusDisplay.sentLatest") : t("statusDisplay.sentOn");
    return [label, formatI18nDate(nextDate, t)];
  }
  if (item.chosen_action === "afhentning") {
    const pickupText = formatPickupDisplay((item as any).pickup_date ?? null, item.notes, t);
    return [t("statusDisplay.pickupOrdered"), pickupText ?? undefined];
  }
  if (item.chosen_action === "gratis_afhentning") {
    const nextDate = getFirstThursdayOfMonth();
    return [t("statusDisplay.pickedUpAt"), formatI18nDate(nextDate, t)];
  }
  if (item.chosen_action === "destruer") {
    return [t("statusDisplay.destroyed")];
  }
  if (item.chosen_action === "daglig") {
    return [t("statusDisplay.officeDelivery")];
  }
  const effectiveAction = item.mail_type === "pakke"
    ? defaultPackageAction
    : defaultMailAction;

  if (effectiveAction === "send" || (!effectiveAction && ["Lite", "Standard", "Plus"].includes(tenantTypeName ?? ""))) {
    const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
    const label = item.mail_type === "pakke" ? t("statusDisplay.sentLatest") : t("statusDisplay.sentOn");
    return [label, formatI18nDate(nextDate, t)];
  }
  if (effectiveAction === "afhentning") {
    if (tenantTypeName === "Lite" && !item.chosen_action) {
      const nextDate = getFirstThursdayOfMonth();
      return [t("statusDisplay.pickedUpAt"), formatI18nDate(nextDate, t)];
    }
    const nextDate = getNextThursday();
    return [t("statusDisplay.pickedUpAt"), formatI18nDate(nextDate, t)];
  }
  if (effectiveAction === "scan") {
    if (tenantTypeName === "Lite" && !item.chosen_action) {
      const nextDate = getFirstThursdayOfMonth();
      return [t("statusDisplay.scanFreeMonthly"), formatI18nDate(nextDate, t)];
    }
    if (tenantTypeName === "Standard" && !item.chosen_action) {
      const nextDate = getNextThursday();
      return [t("statusDisplay.standardScan"), formatI18nDate(nextDate, t)];
    }
    return [t("statusDisplay.awaitingScan"), t("statusDisplay.scannedWithin24h")];
  }
  if (effectiveAction === "daglig" || tenantTypeName === "Fastlejer") {
    return [t("statusDisplay.officeDelivery")];
  }
  if (effectiveAction === "destruer") {
    return [t("statusDisplay.destroyedLabel")];
  }
  const statusLabels = getStatusLabels(t);
  return [statusLabels[item.status as MailStatus] ?? item.status];
}

function getPickupHours(date: Date | undefined): string[] {
  if (!date) return [];
  const day = date.getDay();
  const maxHour = day === 5 ? 14 : 16;
  const hours: string[] = [];
  for (let h = 9; h <= maxHour; h++) {
    hours.push(`${h.toString().padStart(2, "0")}:00-${(h + 1).toString().padStart(2, "0")}:00`);
  }
  return hours;
}

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

interface TenantDashboardProps {
  overrideTenantId?: string;
}

const TenantDashboard = ({ overrideTenantId }: TenantDashboardProps = {}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantsHook = useTenants();

  const { data: overrideTenant } = useQuery({
    queryKey: ["override-tenant", overrideTenantId],
    enabled: !!overrideTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("id", overrideTenantId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const tenants = overrideTenantId ? (overrideTenant ? [overrideTenant] : []) : tenantsHook.tenants;
  const selectedTenant = overrideTenantId ? (overrideTenant ?? null) : tenantsHook.selectedTenant;
  const selectedTenantId = overrideTenantId ?? tenantsHook.selectedTenantId;
  const setSelectedTenantId = tenantsHook.setSelectedTenantId;
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
  const [pickupDialogItem, setPickupDialogItem] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>();
  const [pickupHour, setPickupHour] = useState<string | undefined>();
  const [scanSignedUrl, setScanSignedUrl] = useState<string | null>(null);
  const [logMailItemId, setLogMailItemId] = useState<string | null>(null);
  const [mailTypeFilter, setMailTypeFilter] = useState<"all" | "brev" | "pakke">("all");

  useEffect(() => {
    setScanSignedUrl(null);
    if (!selectedItem?.scan_url) return;
    let cancelled = false;
    supabase.storage
      .from("mail-scans")
      .createSignedUrl(selectedItem.scan_url, 300)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) {
          setScanSignedUrl(data.signedUrl);
        }
      });
    return () => { cancelled = true; };
  }, [selectedItem?.scan_url]);

  const hasMultipleTenants = tenants.length > 1;

  const allowedActions: string[] =
    (selectedTenant?.tenant_types as any)?.allowed_actions as string[] ?? [];
  const tenantTypeName: string | undefined = (selectedTenant?.tenant_types as any)?.name;

  const { data: stats = { ny: 0, afventer_scanning: 0, ulaest: 0, laest: 0, arkiveret: 0 } } = useQuery({
    queryKey: ["tenant-stats", selectedTenantId],
    enabled: !!user && !!selectedTenantId,
    queryFn: async () => {
      const base = (status: MailStatus) =>
        supabase
          .from("mail_items")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
          .eq("tenant_id", selectedTenantId!);

      const scanPendingRes = await supabase
        .from("mail_items")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", selectedTenantId!)
        .eq("chosen_action", "scan")
        .is("scan_url", null);

      const scannetUlaestRes = await supabase
        .from("mail_items")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", selectedTenantId!)
        .not("scan_url", "is", null)
        .eq("status", "ulaest");

      const [nyRes, laestRes, arkiveretRes] = await Promise.all([
        base("ny"),
        base("laest"),
        base("arkiveret"),
      ]);
      return {
        ny: nyRes.count ?? 0,
        afventer_scanning: scanPendingRes.count ?? 0,
        ulaest: scannetUlaestRes.count ?? 0,
        laest: laestRes.count ?? 0,
        arkiveret: arkiveretRes.count ?? 0,
      };
    },
  });

  const { data: mailItems = [], isLoading } = useQuery({
    refetchInterval: 30000,
    queryKey: ["tenant-mail", activeFilter, selectedTenantId],
    enabled: !!user && !!selectedTenantId,
    queryFn: async () => {
      let query = supabase
        .from("mail_items")
        .select("*, tenants(company_name)")
        .eq("tenant_id", selectedTenantId!)
        .order("received_at", { ascending: false });

      if (activeFilter === "afventer_scanning") {
        query = query.eq("chosen_action", "scan").is("scan_url", null);
      } else if (activeFilter === "scannet") {
        query = query.not("scan_url", "is", null).neq("status", "arkiveret" as MailStatus);
      } else if (activeFilter) {
        query = query.eq("status", activeFilter as MailStatus);
      } else {
        query = query.neq("status", "arkiveret" as MailStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredByType = mailTypeFilter === "all" ? mailItems : mailItems.filter((i: any) => i.mail_type === mailTypeFilter);

  const chooseAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ chosen_action: action, status: "afventer_handling" as MailStatus, action_rejected_reason: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      toast.success(t("tenantDashboard.actionChosen"));

      if (variables.action === "scan") {
        supabase.functions.invoke("notify-scan-request", {
          body: { mail_item_id: variables.id },
        }).catch((err) => console.error("Scan notification email failed:", err));
      }
    },
    onError: () => {
      toast.error(t("tenantDashboard.couldNotChooseAction"));
    },
  });

  const cancelAction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ chosen_action: null, pickup_date: null, status: "ny" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      toast.success(t("tenantDashboard.actionCancelled"));
    },
    onError: () => {
      toast.error(t("tenantDashboard.couldNotCancelAction"));
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "laest" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "arkiveret" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      setSelectedItem(null);
      toast.success(t("tenantDashboard.shipmentArchived"));
    },
    onError: () => {
      toast.error(t("tenantDashboard.couldNotArchive"));
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "afventer_handling" as MailStatus, chosen_action: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      setSelectedItem(null);
      toast.success(t("tenantDashboard.shipmentReactivated"));
    },
    onError: () => {
      toast.error(t("tenantDashboard.couldNotReactivate"));
    },
  });

  const handleAction = (id: string, action: string) => {
    if (action === "afhentning" || action === "anden_afhentningsdag") {
      if (action === "afhentning" && tenantTypeName === "Standard") {
        const mailItem = mailItems?.find(i => i.id === id);
        if (mailItem?.mail_type !== "pakke") {
          const nextThurs = getNextThursday();
          nextThurs.setHours(0, 0, 0, 0);
          choosePickup.mutate({ id, pickupIso: nextThurs.toISOString() });
          return;
        }
      }
      setPickupDialogItem(id);
    } else if (action === "destruer") {
      setConfirmDestroy(id);
    } else {
      chooseAction.mutate({ id, action });
    }
  };

  const choosePickup = useMutation({
    mutationFn: async ({ id, pickupIso }: { id: string; pickupIso: string }) => {
      const { error } = await supabase
        .from("mail_items")
        .update({
          chosen_action: "afhentning",
          status: "afventer_handling" as MailStatus,
          pickup_date: pickupIso,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      setPickupDialogItem(null);
      setPickupDate(undefined);
      setPickupHour(undefined);
      toast.success(t("tenantDashboard.pickupOrdered"));
    },
    onError: () => {
      toast.error(t("tenantDashboard.couldNotOrderPickup"));
    },
  });

  const handleCardClick = (status: FilterStatus) => {
    setActiveFilter((prev) => (prev === status ? null : status));
  };

  const handleRowClick = async (item: MailItem) => {
    const { data: fresh } = await supabase
      .from("mail_items")
      .select("*, tenants(company_name)")
      .eq("id", item.id)
      .single();
    const current = (fresh ?? item) as MailItem;
    setSelectedItem(current);
    if (current.scan_url && (current.status === "ulaest" || current.status === "ny")) {
      markAsRead.mutate(current.id);
    }
    if (current.notes && !(current as any).note_read) {
      await supabase.from("mail_items").update({ note_read: true }).eq("id", current.id);
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
    }
  };

  const handleDownloadScan = async () => {
    if (!selectedItem?.scan_url) return;
    const { data, error } = await supabase.storage
      .from("mail-scans")
      .createSignedUrl(selectedItem.scan_url, 60);
    if (error || !data?.signedUrl) {
      toast.error(t("tenantDashboard.couldNotDownloadScan"));
      return;
    }
    window.open(data.signedUrl, "_blank");
    if (selectedItem.status === "ulaest" || selectedItem.status === "ny") {
      markAsRead.mutate(selectedItem.id);
    }
  };

  const canArchive =
    selectedItem &&
    (selectedItem.status === "laest" || selectedItem.status === "afventer_handling" ||
      selectedItem.status === "ny" || selectedItem.status === "ulaest");

  const totalActive = stats.ny + stats.afventer_scanning + stats.ulaest + stats.laest;

  const ACTION_LABELS = getActionLabelsMap(t);

  const cards = [
    { title: t("tenantDashboard.allShipments"), value: totalActive, icon: Inbox, status: null as FilterStatus },
    { title: t("tenantDashboard.newShipment"), value: stats.ny, icon: Mail, status: "ny" as FilterStatus },
    { title: t("tenantDashboard.awaitingScan"), value: stats.afventer_scanning, icon: ScanLine, status: "afventer_scanning" as FilterStatus },
    { title: t("tenantDashboard.scannedMail"), value: stats.ulaest, icon: FileCheck, status: "scannet" as FilterStatus },
    { title: t("tenantDashboard.archived"), value: stats.arkiveret, icon: Archive, status: "arkiveret" as FilterStatus },
  ];

  const needsDefaultActions =
    selectedTenant &&
    ["Lite", "Standard", "Plus"].includes(tenantTypeName ?? "") &&
    ((selectedTenant as any).default_mail_action == null || (selectedTenant as any).default_package_action == null);

  const hasUnpaidInvoice = !!(selectedTenant as any)?.has_unpaid_invoice;

  const locale = i18n.language === "da" ? "da-DK" : "en-GB";

  return (
    <div>
      {needsDefaultActions && (
        <DefaultActionSetup
          tenantId={selectedTenant!.id}
          tenantTypeName={tenantTypeName!}
        />
      )}
      {!overrideTenantId && tenants.length > 0 && (
        <div className="mb-6">
          <TenantSelector
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onSelect={setSelectedTenantId}
          />
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl md:text-2xl font-bold">{t("tenantDashboard.title")}</h2>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">{t("tenantDashboard.beta")}</Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:kontakt@flexum.dk?subject=${encodeURIComponent(`${t("tenantDashboard.giveFeedback")} - ${selectedTenant?.company_name || ""}`)}`}>
            <MessageCircle className="h-4 w-4 mr-1" />
            {t("tenantDashboard.giveFeedback")}
          </a>
        </Button>
      </div>

      {hasUnpaidInvoice && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">{t("tenantDashboard.unpaidInvoiceTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("tenantDashboard.unpaidInvoiceDesc")}</p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-8">
        {cards.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer transition-all ${
              activeFilter === card.status
                ? "ring-2 ring-primary shadow-md"
                : "hover:shadow-sm"
            }`}
            onClick={() => handleCardClick(card.status)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mail type filter */}
      <RadioGroup
        value={mailTypeFilter}
        onValueChange={(v) => setMailTypeFilter(v as "all" | "brev" | "pakke")}
        className="flex items-center gap-4 mb-4"
      >
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="all" id="tenant-filter-all" />
          <Label htmlFor="tenant-filter-all" className="cursor-pointer">{t("common.all")}</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="brev" id="tenant-filter-brev" />
          <Label htmlFor="tenant-filter-brev" className="cursor-pointer">{t("common.letters")}</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="pakke" id="tenant-filter-pakke" />
          <Label htmlFor="tenant-filter-pakke" className="cursor-pointer">{t("common.packages")}</Label>
        </div>
      </RadioGroup>

      {/* Mail table */}
      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : filteredByType.length === 0 ? (
        <p className="text-muted-foreground">{t("tenantDashboard.noMailFound")}</p>
      ) : (
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{t("common.photo")}</TableHead>
              <TableHead>{t("common.type")}</TableHead>
              {hasMultipleTenants && <TableHead>{t("tenantDashboard.company")}</TableHead>}
              <TableHead>{t("operatorDashboard.stampNumber")}</TableHead>
              <TableHead>{t("tenantDashboard.sender")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
              <TableHead>{t("common.fee")}</TableHead>
              <TableHead>{t("common.scan")}</TableHead>
              <TableHead>{t("common.received")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredByType.map((item: any) => (
              <TableRow
                key={item.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  getMailRowColor(item),
                  hasUnpaidInvoice && "opacity-50 pointer-events-none"
                )}
                onClick={() => !hasUnpaidInvoice && handleRowClick(item)}
              >
                <TableCell>
                  <PhotoHoverPreview photoUrl={item.photo_url} />
                </TableCell>
                <TableCell>
                  <Badge variant={item.mail_type === "pakke" ? "secondary" : "outline"}>
                    {item.mail_type === "pakke" ? t("common.package") : t("common.letter")}
                  </Badge>
                </TableCell>
                {hasMultipleTenants && (
                  <TableCell className="text-sm">
                    {item.tenants?.company_name ?? "—"}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.stamp_number ?? "—"}
                    {item.notes && !item.note_read && (
                      <MessageSquare className="h-4 w-4 text-blue-500 fill-blue-50" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {item.sender_name ?? "—"}
                    {(item as any).is_registered && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t("common.registered")}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const [line1, line2] = getStatusDisplay(item, tenantTypeName, t, selectedTenant?.default_mail_action, selectedTenant?.default_package_action);
                    const rejectedReason = (item as any).action_rejected_reason;
                    if (rejectedReason && !item.chosen_action) {
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-help">
                                <Badge variant="destructive">{line1}</Badge>
                                <MessageSquare className="h-4 w-4 text-destructive" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <p className="text-xs">{rejectedReason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }
                    return (
                      <div>
                        <Badge variant="outline">{line1}</Badge>
                        {line2 && <p className="text-[11px] text-muted-foreground mt-1">{line2}</p>}
                        {item.status === "sendt_med_postnord" && item.tracking_number && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://tracking.postnord.com/da/tracking?id=${item.tracking_number}`, "_blank");
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("tenantDashboard.trackPackage")}
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const scanExpired = item.chosen_action === "scan" && item.scan_url && getDaysLeftForScan((item as any).scanned_at ?? null) === 0;
                    const isSentWithDao = item.status === "sendt_med_dao" || item.status === "sendt_med_postnord" || item.status === "sendt_retur";

                    const defaultAction = item.mail_type === "pakke"
                      ? (selectedTenant as any)?.default_package_action
                      : (selectedTenant as any)?.default_mail_action;
                    const effectiveAction = item.chosen_action ?? defaultAction ?? "send";
                    const shippingDate = getNextShippingDate(tenantTypeName, item.mail_type);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    shippingDate.setHours(0, 0, 0, 0);
                    const packingDay = new Date(shippingDate);
                    packingDay.setDate(packingDay.getDate() - 1);
                    const isLockedForShipping = !item.chosen_action && effectiveAction === "send" && today >= packingDay;

                    if (item.status === "arkiveret" && item.chosen_action !== "destruer") {
                      return (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => reactivateMutation.mutate(item.id)}
                          title={t("tenantDashboard.reactivateShipment")}
                          className="h-8 w-8 text-blue-600 hover:text-blue-800"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      );
                    }

                    if (scanExpired || isSentWithDao || (isLockedForShipping && item.status !== "arkiveret")) {
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => archiveMutation.mutate(item.id)}
                          disabled={archiveMutation.isPending}
                        >
                          {t("common.archive")}
                        </Button>
                      );
                    }

                    if (item.chosen_action && item.chosen_action !== "destruer") {
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelAction.mutate(item.id)}
                          title={t("tenantDashboard.cancelAction")}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          {t("tenantDashboard.cancelAction")}
                        </Button>
                      );
                    }

                    if (allowedActions.length > 0) {
                      let actionForExtras = effectiveAction;
                      if (!item.chosen_action && tenantTypeName === "Lite" && effectiveAction === "scan") {
                        actionForExtras = "standard_scan";
                      }
                      if (!item.chosen_action && tenantTypeName === "Lite" && effectiveAction === "send") {
                        actionForExtras = "standard_forsendelse";
                      }
                      if (!item.chosen_action && tenantTypeName === "Lite" && item.mail_type === "pakke" && effectiveAction === "afhentning") {
                        actionForExtras = "standard_afhentning";
                      }
                      if (!item.chosen_action && tenantTypeName === "Standard" && item.mail_type === "pakke") {
                        if (effectiveAction === "afhentning") actionForExtras = "standard_afhentning";
                        else if (effectiveAction === "send") actionForExtras = "standard_forsendelse";
                      }
                      if (!item.chosen_action && tenantTypeName === "Standard" && item.mail_type !== "pakke" && effectiveAction === "scan") {
                        actionForExtras = "standard_scan";
                      }
                      const extraActions = getExtraActions(tenantTypeName, item.mail_type, actionForExtras, defaultAction);
                      const availableExtras = extraActions.filter(
                        (a) => a === "destruer" || a === "gratis_afhentning" || allowedActions.includes(a) || (a === "anden_afhentningsdag" && allowedActions.includes("afhentning")) || (a === "standard_forsendelse" && allowedActions.includes("send")) || (a === "standard_scan" && allowedActions.includes("scan")) || (a === "standard_afhentning" && allowedActions.includes("afhentning"))
                      );

                      if (availableExtras.length === 0) {
                        return defaultAction ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {ACTION_LABELS[defaultAction] ?? defaultAction}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>;
                      }

                      return (
                        <Select
                          value=""
                          onValueChange={(value) => handleAction(item.id, value)}
                          disabled={chooseAction.isPending}
                        >
                          <SelectTrigger className="h-8 w-[140px] sm:w-[180px] text-xs">
                            <SelectValue placeholder={t("tenantDashboard.selectAction")} />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {availableExtras.map((action) => (
                              <SelectItem key={action} value={action} className="text-xs">
                                {getActionLabel(action, tenantTypeName, t)}
                                {(() => { const p = getActionPrice(action, tenantTypeName, item.mail_type); return p ? ` (${p})` : ""; })()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }

                    if (item.chosen_action) {
                      return (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {ACTION_LABELS[item.chosen_action] ?? item.chosen_action}
                        </Badge>
                      );
                    }
                    return <span className="text-muted-foreground">—</span>;
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const defaultAction = item.mail_type === "pakke"
                      ? selectedTenant?.default_package_action
                      : selectedTenant?.default_mail_action;
                    const fee = getItemFee(tenantTypeName, item.mail_type, item.chosen_action, defaultAction, (item as any).pickup_date ?? null, item.notes, t);
                    return <span className={cn("text-sm", fee === "—" || fee === "0 kr." ? "text-muted-foreground" : "font-medium")}>{fee}</span>;
                  })()}
                </TableCell>
                <TableCell>
                  {item.scan_url ? (
                    <ScanThumbnail scanUrl={item.scan_url} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-sm"
                    onClick={(e) => { e.stopPropagation(); setLogMailItemId(item.id); }}
                  >
                    {new Date(item.received_at).toLocaleDateString(locale)}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("tenantDashboard.shipmentDetails")}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className={selectedItem.scan_url ? "grid grid-cols-3 gap-6" : ""}>
              {selectedItem.scan_url && (
                <div className="col-span-2 flex items-center justify-center bg-muted/30 rounded border min-h-[300px]">
                  {scanSignedUrl ? (
                    selectedItem.scan_url.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={scanSignedUrl}
                        title={t("tenantDashboard.scannedDocument")}
                        className="w-full h-[70vh] rounded"
                      />
                    ) : (
                      <img
                        src={scanSignedUrl}
                        alt={t("tenantDashboard.scannedDocument")}
                        className="w-full max-h-[70vh] object-contain rounded"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ScanLine className="h-8 w-8 animate-pulse" />
                      <span className="text-sm">{t("tenantDashboard.scanPreviewLoading")}</span>
                    </div>
                  )}
                </div>
              )}
              <div className={`space-y-4 ${selectedItem.scan_url ? "col-span-1" : ""}`}>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("common.type")}</span>
                    <p className="font-medium">
                      {selectedItem.mail_type === "pakke" ? t("common.package") : t("common.letter")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("operatorDashboard.stampNumber")}</span>
                    <p className="font-medium">{selectedItem.stamp_number ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("tenantDashboard.sender")}</span>
                    <p className="font-medium">{selectedItem.sender_name ?? t("common.unknown")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common.status")}</span>
                    {(() => {
                      const [line1, line2] = getStatusDisplay(selectedItem, tenantTypeName, t, selectedTenant?.default_mail_action, selectedTenant?.default_package_action);
                      return (
                        <div>
                          <Badge variant="outline">{line1}</Badge>
                          {line2 && <p className="text-[11px] text-muted-foreground mt-1">{line2}</p>}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("tenantDashboard.chosenAction")}</span>
                    <p className="font-medium">
                      {selectedItem.chosen_action
                        ? ACTION_LABELS[selectedItem.chosen_action] ?? selectedItem.chosen_action
                        : t("common.none")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common.received")}</span>
                    <p className="font-medium">
                      {new Date(selectedItem.received_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
              {selectedItem.notes && !selectedItem.notes.startsWith("PICKUP:") && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t("tenantDashboard.operatorNote")}</span>
                    <p className="mt-1 rounded bg-muted p-3">{selectedItem.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedItem?.scan_url && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleDownloadScan}
              >
                <Download className="h-4 w-4" />
                {t("tenantDashboard.downloadScan")}
              </Button>
            )}
            {selectedItem?.status === "arkiveret" && selectedItem?.chosen_action !== "destruer" && (
              <Button
                variant="outline"
                onClick={() => reactivateMutation.mutate(selectedItem!.id)}
                disabled={reactivateMutation.isPending}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                {reactivateMutation.isPending ? t("common.reactivating") : t("common.reactivate")}
              </Button>
            )}
            {canArchive && selectedItem?.status !== "arkiveret" && (
              <Button
                variant="outline"
                onClick={() => archiveMutation.mutate(selectedItem!.id)}
                disabled={archiveMutation.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                {archiveMutation.isPending ? t("tenantDashboard.archiving") : t("common.archive")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedItem(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo preview dialog */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("common.photo")}</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img src={photoPreview} alt={t("tenantDashboard.shipmentDetails")} className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm destroy dialog */}
      <Dialog open={!!confirmDestroy} onOpenChange={() => setConfirmDestroy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tenantDashboard.confirmDestroyTitle")}</DialogTitle>
            <DialogDescription>
              {t("tenantDashboard.confirmDestroyDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDestroy(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDestroy) {
                  chooseAction.mutate({ id: confirmDestroy, action: "destruer" });
                  setConfirmDestroy(null);
                }
              }}
            >
              {t("actions.destruer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pickup calendar dialog */}
      <Dialog
        open={!!pickupDialogItem}
        onOpenChange={(open) => {
          if (!open) {
            setPickupDialogItem(null);
            setPickupDate(undefined);
            setPickupHour(undefined);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("tenantDashboard.pickupDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("tenantDashboard.pickupDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={pickupDate}
              onSelect={(date) => {
                setPickupDate(date);
                setPickupHour(undefined);
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today || isWeekend(date);
              }}
              className="p-3 pointer-events-auto"
            />
            {pickupDate && (
              <Select value={pickupHour} onValueChange={setPickupHour}>
                <SelectTrigger>
                  <SelectValue placeholder={t("tenantDashboard.selectTimeSlot")} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {getPickupHours(pickupDate).map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPickupDialogItem(null);
                setPickupDate(undefined);
                setPickupHour(undefined);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!pickupDate || !pickupHour || choosePickup.isPending}
              onClick={() => {
                if (pickupDialogItem && pickupDate && pickupHour) {
                  const hour = parseInt(pickupHour.split(":")[0], 10);
                  const dt = new Date(pickupDate);
                  dt.setHours(hour, 0, 0, 0);
                  choosePickup.mutate({
                    id: pickupDialogItem,
                    pickupIso: dt.toISOString(),
                  });
                }
              }}
            >
              {choosePickup.isPending ? t("tenantDashboard.orderingPickup") : t("tenantDashboard.orderPickup")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MailItemLogSheet mailItemId={logMailItemId} open={!!logMailItemId} onOpenChange={(v) => { if (!v) setLogMailItemId(null); }} />
    </div>
  );
};

export default TenantDashboard;
