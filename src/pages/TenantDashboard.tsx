import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Mail, Archive, ImageIcon, ScanLine, Download, CalendarIcon, FileCheck, Undo2, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMailRowColor } from "@/lib/mailRowColor";
import { ScanThumbnail } from "@/components/ScanThumbnail";
import { PhotoHoverPreview } from "@/components/PhotoHoverPreview";
import { toast } from "sonner";
import { DefaultActionSetup } from "@/components/DefaultActionSetup";
import { MailItemLogSheet } from "@/components/MailItemLogSheet";
import type { Database } from "@/integrations/supabase/types";

type MailStatus = Database["public"]["Enums"]["mail_status"];
type MailItem = Database["public"]["Tables"]["mail_items"]["Row"];

const STATUS_LABELS: Record<MailStatus, string> = {
  ny: "Ny",
  afventer_handling: "Afventer handling",
  ulaest: "Ulæst",
  laest: "Læst",
  arkiveret: "Arkiveret",
};

const ACTION_LABELS: Record<string, string> = {
  scan: "Scan nu",
  send: "Forsendelse",
  afhentning: "Afhentning",
  destruer: "Destruer",
  daglig: "Lig på kontoret",
  anden_afhentningsdag: "Anden afhentningsdag",
  standard_forsendelse: "Standard forsendelse",
  standard_scan: "Standard scanning",
};

/** Returns the extra actions available for a given tier, mail type and current effective action */
function getExtraActions(tenantTypeName: string | undefined, mailType: string, currentAction?: string | null): string[] {
  const addDestruer = (actions: string[]) => {
    if (currentAction === "destruer") return actions;
    return [...actions, "destruer"];
  };
  if (mailType === "pakke") {
    return addDestruer(["send", "afhentning"].filter(a => a !== currentAction));
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
      case "send":       return addDestruer(["scan", "standard_scan", "afhentning"]);
      default:           return addDestruer(["scan", "standard_scan", "afhentning", "send"]);
    }
  }
  if (tenantTypeName === "Lite") {
    switch (currentAction) {
      case "afhentning": return addDestruer(["scan", "standard_scan", "send", "standard_forsendelse", "anden_afhentningsdag"]);
      case "scan":       return addDestruer(["standard_scan", "send", "standard_forsendelse", "afhentning"]);
      case "standard_scan": return addDestruer(["scan", "send", "standard_forsendelse", "afhentning"]);
      case "send":       return addDestruer(["scan", "standard_scan", "send", "standard_forsendelse", "afhentning"]);
      default:           return addDestruer(["scan", "standard_scan", "send", "standard_forsendelse", "afhentning"]);
    }
  }
  return [];
}

/** Returns a tenant-type-specific label for an action */
function getActionLabel(action: string, tenantTypeName: string | undefined): string {
  if (tenantTypeName === "Lite") {
    if (action === "scan") return "Scan nu";
    if (action === "standard_scan") return "Standard scanning";
    if (action === "send") return "Send hurtigst muligt";
    if (action === "standard_forsendelse") return "Standard forsendelse";
  }
  if (tenantTypeName === "Standard") {
    if (action === "scan") return "Scan nu";
    if (action === "standard_scan") return "Standard scanning";
  }
  return ACTION_LABELS[action] ?? action;
}

/** Parse a pickup date from the dedicated column or legacy notes field */
function parsePickupDate(pickupDate: string | null, notes: string | null): Date | null {
  if (pickupDate) {
    const d = new Date(pickupDate);
    return isNaN(d.getTime()) ? null : d;
  }
  // Legacy fallback
  if (notes && notes.startsWith("PICKUP:")) {
    const d = new Date(notes.replace("PICKUP:", ""));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Check if a pickup date falls on a "free Thursday" for the given tier */
function isFreeTorsdag(date: Date, tenantTypeName: string | undefined): boolean {
  if (date.getDay() !== 4) return false; // not a Thursday
  if (tenantTypeName === "Standard") return true; // any Thursday is free
  if (tenantTypeName === "Lite") {
    // Only the first Thursday of the month is free
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
  notes: string | null
): string {
  // No action chosen → standard handling
  if (!chosenAction || chosenAction === defaultAction) {
    // Special case: afhentning on a non-free day still costs extra
    if (chosenAction === "afhentning" && tenantTypeName !== "Plus") {
      const pd = parsePickupDate(pickupDateStr, notes);
      if (pd && !isFreeTorsdag(pd, tenantTypeName)) {
        return tenantTypeName === "Standard" ? "30 kr." : "50 kr.";
      }
    }
    if ((chosenAction || defaultAction) === "send") return "0 kr. + porto";
    return "0 kr.";
  }
  // Plus: everything is free
  if (tenantTypeName === "Plus") {
    if (chosenAction === "send") return "0 kr. + porto";
    return "0 kr.";
  }
  // Standard forsendelse for Lite is free + porto
  if (chosenAction === "standard_forsendelse") return "0 kr. + porto";
  // Standard scanning for Lite is free
  if (chosenAction === "standard_scan") return "0 kr.";
  // Extra handling prices
  const extraPrice = tenantTypeName === "Lite" ? "50 kr." : "30 kr.";
  if (chosenAction === "scan") return extraPrice;
  if (chosenAction === "send") {
    // Standard doesn't have "send hurtigst muligt"
    if (tenantTypeName === "Standard") return "—";
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
function getActionPrice(action: string, tenantTypeName: string | undefined): string {
  if (action === "destruer") return "0 kr.";
  if (tenantTypeName === "Plus") {
    if (action === "send") return "0 kr. + porto";
    return "0 kr.";
  }
  if (tenantTypeName === "Lite") {
    if (action === "scan") return "50 kr.";
    if (action === "standard_scan") return "0 kr.";
    if (action === "send") return "50 kr. + porto";
    if (action === "standard_forsendelse") return "0 kr. + porto";
    if (action === "afhentning" || action === "anden_afhentningsdag") return "50 kr.";
  }
  if (tenantTypeName === "Standard") {
    if (action === "scan") return "30 kr.";
    if (action === "standard_scan") return "0 kr.";
    if (action === "afhentning" || action === "anden_afhentningsdag") return "30 kr.";
  }
  return "";
}

type FilterStatus = "ny" | "afventer_scanning" | "scannet" | "arkiveret" | null;

/* ── Date helpers ── */

const DANISH_DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const DANISH_MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

function formatDanishDate(date: Date): string {
  const day = DANISH_DAYS[date.getDay()];
  const d = date.getDate();
  const month = DANISH_MONTHS[date.getMonth()];
  return `${day} den ${d}. ${month}`;
}

/** First Thursday of this month (or next month if already passed) */
function getFirstThursdayOfMonth(): Date {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfWeek = first.getDay();
  const offset = (4 - dayOfWeek + 7) % 7;
  const firstThursday = new Date(now.getFullYear(), now.getMonth(), 1 + offset);

  // If already passed, use first Thursday of next month
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
  const daysUntil = (4 - dayOfWeek + 7) % 7 || 7; // if today is Thu, use next Thu
  const d = new Date(now);
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function getNextShippingDate(tenantType: string | undefined, mailType: string): Date {
  if (tenantType === "Lite" && mailType === "brev") {
    return getFirstThursdayOfMonth();
  }
  return getNextThursday();
}

/* ── Pickup helpers ── */

function formatPickupDisplay(pickupDateStr: string | null, notes: string | null): string | null {
  const date = parsePickupDate(pickupDateStr, notes);
  if (!date) return null;
  const dayName = DANISH_DAYS[date.getDay()];
  const d = date.getDate();
  const month = DANISH_MONTHS[date.getMonth()];
  const hour = date.getHours();
  return `${dayName} den ${d}. ${month} kl. ${hour.toString().padStart(2, "0")}:00-${(hour + 1).toString().padStart(2, "0")}:00`;
}

function getDaysLeftForScan(scannedAt: string | null): number | null {
  if (!scannedAt) return null;
  const scannedDate = new Date(scannedAt);
  const now = new Date();
  const diffMs = now.getTime() - scannedDate.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysSince);
}

function getStatusDisplay(
  item: { chosen_action: string | null; scan_url: string | null; status: string; mail_type: string; notes: string | null; pickup_date?: string | null; scanned_at?: string | null; action_rejected_reason?: string | null },
  tenantTypeName: string | undefined,
  defaultMailAction?: string | null,
  defaultPackageAction?: string | null
): [string, string?] {
  // Action rejected by operator
  if ((item as any).action_rejected_reason && !item.chosen_action) {
    return ["Handling afvist"];
  }
  if (item.chosen_action === "scan" && !item.scan_url) {
    return ["Afventer scanning", "Scannes inden for 24 timer"];
  }
  if (item.chosen_action === "scan" && item.scan_url) {
    const daysLeft = getDaysLeftForScan(item.scanned_at ?? null);
    if (daysLeft !== null && daysLeft <= 0) {
      return ["Brevet er destrueret"];
    }
    const statusLabel = item.status === "ulaest" ? "Ulæst" : item.status === "laest" ? "Læst" : "Scannet";
    const subtitle = daysLeft !== null ? `Fysisk brev gemmes i ${daysLeft} dage` : undefined;
    return [statusLabel, subtitle];
  }
  if (item.chosen_action === "standard_forsendelse") {
    const nextDate = getFirstThursdayOfMonth();
    return ["Sendes", formatDanishDate(nextDate)];
  }
  if (item.chosen_action === "standard_scan") {
    const nextDate = tenantTypeName === "Lite" ? getFirstThursdayOfMonth() : getNextThursday();
    return ["Scannes", formatDanishDate(nextDate)];
  }
  if (item.chosen_action === "send") {
    const nextDate = getNextThursday();
    return ["Sendes", formatDanishDate(nextDate)];
  }
  if (item.chosen_action === "afhentning") {
    const pickupText = formatPickupDisplay((item as any).pickup_date ?? null, item.notes);
    return ["Afhentning bestilt", pickupText ?? undefined];
  }
  if (item.chosen_action === "destruer") {
    return ["Destrueret"];
  }
  if (item.chosen_action === "daglig") {
    return ["Lægges på kontoret"];
  }
  // No action chosen → use tenant default
  const effectiveAction = item.mail_type === "pakke"
    ? defaultPackageAction
    : defaultMailAction;

  if (effectiveAction === "send" || (!effectiveAction && ["Lite", "Standard", "Plus"].includes(tenantTypeName ?? ""))) {
    const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
    return ["Sendes", formatDanishDate(nextDate)];
  }
  if (effectiveAction === "afhentning") {
    // Lite default pickup uses monthly Thursday; Standard/Plus use weekly
    if (tenantTypeName === "Lite" && !item.chosen_action) {
      const nextDate = getFirstThursdayOfMonth();
      return ["Afhentes", formatDanishDate(nextDate)];
    }
    const nextDate = getNextThursday();
    return ["Afhentes", formatDanishDate(nextDate)];
  }
  if (effectiveAction === "scan") {
    // Lite default scan happens on first Thursday of month
    if (tenantTypeName === "Lite" && !item.chosen_action) {
      const nextDate = getFirstThursdayOfMonth();
      return ["Scannes gratis den første torsdag i måneden", formatDanishDate(nextDate)];
    }
    return ["Afventer scanning", "Scannes inden for 24 timer"];
  }
  if (effectiveAction === "daglig" || tenantTypeName === "Fastlejer") {
    return ["Lægges på kontoret"];
  }
  if (effectiveAction === "destruer") {
    return ["Destrueres"];
  }
  return [STATUS_LABELS[item.status as MailStatus] ?? item.status];
}

function getPickupHours(date: Date | undefined): string[] {
  if (!date) return [];
  const day = date.getDay(); // 5 = Friday
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

const TenantDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId } = useTenants();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
  const [pickupDialogItem, setPickupDialogItem] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>();
  const [pickupHour, setPickupHour] = useState<string | undefined>();
  const [scanSignedUrl, setScanSignedUrl] = useState<string | null>(null);
  const [logMailItemId, setLogMailItemId] = useState<string | null>(null);

  // Generate signed URL for scan preview when dialog opens
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

  // Derive allowed actions and tenant type name
  const allowedActions: string[] =
    (selectedTenant?.tenant_types as any)?.allowed_actions as string[] ?? [];
  const tenantTypeName: string | undefined = (selectedTenant?.tenant_types as any)?.name;

  // Fetch stats filtered by selected tenant
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

      // Count items awaiting scanning: chosen_action='scan' and scan_url is null
      const scanPendingRes = await supabase
        .from("mail_items")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", selectedTenantId!)
        .eq("chosen_action", "scan")
        .is("scan_url", null);

      // Count scanned unread items for "Scannet post" card
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

  // Fetch mail items filtered by selected tenant
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

  // Choose action mutation
  const chooseAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ chosen_action: action, status: "afventer_handling" as MailStatus, action_rejected_reason: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      toast.success("Handling valgt");
    },
    onError: () => {
      toast.error("Kunne ikke vælge handling");
    },
  });

  // Cancel action mutation
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
      toast.success("Handling annulleret");
    },
    onError: () => {
      toast.error("Kunne ikke annullere handling");
    },
  });

  // Mark as read mutation
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

  // Archive mutation
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
      toast.success("Forsendelse arkiveret");
    },
    onError: () => {
      toast.error("Kunne ikke arkivere");
    },
  });

  const handleAction = (id: string, action: string) => {
    if (action === "afhentning" || action === "anden_afhentningsdag") {
      setPickupDialogItem(id);
    } else if (action === "destruer") {
      setConfirmDestroy(id);
    } else {
      chooseAction.mutate({ id, action });
    }
  };

  // Pickup mutation
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
      toast.success("Afhentning bestilt");
    },
    onError: () => {
      toast.error("Kunne ikke bestille afhentning");
    },
  });

  const handleCardClick = (status: FilterStatus) => {
    setActiveFilter((prev) => (prev === status ? null : status));
  };

  const handleRowClick = async (item: MailItem) => {
    // Fetch fresh data for this item
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
    // Mark operator note as read
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
      toast.error("Kunne ikke hente scanning");
      return;
    }
    window.open(data.signedUrl, "_blank");
    // Mark as read only when scan is downloaded
    if (selectedItem.status === "ulaest" || selectedItem.status === "ny") {
      markAsRead.mutate(selectedItem.id);
    }
  };

  const canArchive =
    selectedItem &&
    (selectedItem.status === "laest" || selectedItem.status === "afventer_handling" ||
      selectedItem.status === "ny" || selectedItem.status === "ulaest");

  const cards = [
    { title: "Ny forsendelse", value: stats.ny, icon: Mail, status: "ny" as FilterStatus },
    { title: "Afventer scanning", value: stats.afventer_scanning, icon: ScanLine, status: "afventer_scanning" as FilterStatus },
    { title: "Scannet post", value: stats.ulaest, icon: FileCheck, status: "scannet" as FilterStatus },
    { title: "Arkiveret", value: stats.arkiveret, icon: Archive, status: "arkiveret" as FilterStatus },
  ];

  // Check if default actions need to be set (first login flow)
  const needsDefaultActions =
    selectedTenant &&
    ["Lite", "Standard", "Plus"].includes(tenantTypeName ?? "") &&
    ((selectedTenant as any).default_mail_action == null || (selectedTenant as any).default_package_action == null);

  return (
    <div>
      {needsDefaultActions && (
        <DefaultActionSetup
          tenantId={selectedTenant!.id}
          tenantTypeName={tenantTypeName!}
        />
      )}
      {tenants.length > 0 && (
        <div className="mb-6">
          <TenantSelector
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onSelect={setSelectedTenantId}
          />
        </div>
      )}
      <h2 className="text-xl md:text-2xl font-bold mb-6">Min post</h2>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-8">
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

      {/* Mail table */}
      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : mailItems.length === 0 ? (
        <p className="text-muted-foreground">Ingen post fundet.</p>
      ) : (
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Type</TableHead>
              {hasMultipleTenants && <TableHead>Virksomhed</TableHead>}
              <TableHead>Forsendelsesnr.</TableHead>
              <TableHead>Afsender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vælg handling</TableHead>
              <TableHead>Annuller handling</TableHead>
              <TableHead>Gebyr</TableHead>
              <TableHead>Scan</TableHead>
              <TableHead>Modtaget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mailItems.map((item: any) => (
              <TableRow
                key={item.id}
                className={cn("cursor-pointer hover:bg-muted/50", getMailRowColor(item))}
                onClick={() => handleRowClick(item)}
              >
                <TableCell>
                  <PhotoHoverPreview photoUrl={item.photo_url} />
                </TableCell>
                <TableCell>
                  <Badge variant={item.mail_type === "pakke" ? "secondary" : "outline"}>
                    {item.mail_type === "pakke" ? "Pakke" : "Brev"}
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
                <TableCell>{item.sender_name ?? "—"}</TableCell>
                <TableCell>
                  {(() => {
                    const [line1, line2] = getStatusDisplay(item, tenantTypeName, selectedTenant?.default_mail_action, selectedTenant?.default_package_action);
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
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const scanExpired = item.chosen_action === "scan" && item.scan_url && getDaysLeftForScan((item as any).scanned_at ?? null) === 0;

                    // Check if actions should be locked (packing day = shipping day - 1)
                    // Only lock when the effective action is "send" (shipping flow)
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

                    if (scanExpired || (isLockedForShipping && item.status !== "arkiveret")) {
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => archiveMutation.mutate(item.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Arkivér
                        </Button>
                      );
                    }
                    if (item.status !== "arkiveret" && allowedActions.length > 0) {
                      const extraActions = getExtraActions(tenantTypeName, item.mail_type, effectiveAction);
                      // Filter: only show extra actions, exclude the current default
                      const availableExtras = extraActions.filter(
                        (a) => allowedActions.includes(a) || (a === "anden_afhentningsdag" && allowedActions.includes("afhentning")) || (a === "standard_forsendelse" && allowedActions.includes("send")) || (a === "standard_scan" && allowedActions.includes("scan"))
                      );
                      // price per action is now computed individually

                      if (availableExtras.length === 0) {
                        // No extra actions (e.g. Plus breve) — show default action badge
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
                            <SelectValue placeholder="Ekstra handling" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {availableExtras.map((action) => (
                              <SelectItem key={action} value={action} className="text-xs">
                                {getActionLabel(action, tenantTypeName)}
                                {(() => { const p = getActionPrice(action, tenantTypeName); return p ? ` (${p})` : ""; })()}
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {item.chosen_action && item.status !== "arkiveret" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelAction.mutate(item.id)}
                      title="Annuller handling"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </TableCell>
                <TableCell>
                  {(() => {
                    const defaultAction = item.mail_type === "pakke"
                      ? selectedTenant?.default_package_action
                      : selectedTenant?.default_mail_action;
                    const fee = getItemFee(tenantTypeName, item.mail_type, item.chosen_action, defaultAction, (item as any).pickup_date ?? null, item.notes);
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
                    {new Date(item.received_at).toLocaleDateString("da-DK")}
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
            <DialogTitle>Forsendelsesdetaljer</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className={selectedItem.scan_url ? "grid grid-cols-3 gap-6" : ""}>
              {selectedItem.scan_url && (
                <div className="col-span-2 flex items-center justify-center bg-muted/30 rounded border min-h-[300px]">
                  {scanSignedUrl ? (
                    selectedItem.scan_url.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={scanSignedUrl}
                        title="Scannet dokument"
                        className="w-full h-[70vh] rounded"
                      />
                    ) : (
                      <img
                        src={scanSignedUrl}
                        alt="Scannet dokument"
                        className="w-full max-h-[70vh] object-contain rounded"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ScanLine className="h-8 w-8 animate-pulse" />
                      <span className="text-sm">Indlæser forhåndsvisning…</span>
                    </div>
                  )}
                </div>
              )}
              <div className={`space-y-4 ${selectedItem.scan_url ? "col-span-1" : ""}`}>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium">
                      {selectedItem.mail_type === "pakke" ? "Pakke" : "Brev"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Forsendelsesnr.</span>
                    <p className="font-medium">{selectedItem.stamp_number ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Afsender</span>
                    <p className="font-medium">{selectedItem.sender_name ?? "Ukendt"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    {(() => {
                      const [line1, line2] = getStatusDisplay(selectedItem, tenantTypeName, selectedTenant?.default_mail_action, selectedTenant?.default_package_action);
                      return (
                        <div>
                          <Badge variant="outline">{line1}</Badge>
                          {line2 && <p className="text-[11px] text-muted-foreground mt-1">{line2}</p>}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valgt handling</span>
                    <p className="font-medium">
                      {selectedItem.chosen_action
                        ? ACTION_LABELS[selectedItem.chosen_action] ?? selectedItem.chosen_action
                        : "Ingen"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modtaget</span>
                    <p className="font-medium">
                      {new Date(selectedItem.received_at).toLocaleDateString("da-DK")}
                    </p>
                  </div>
                </div>
              {selectedItem.notes && !selectedItem.notes.startsWith("PICKUP:") && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Noter fra operatør</span>
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
                Download scanning
              </Button>
            )}
            {canArchive && selectedItem!.status !== "arkiveret" && (
              <Button
                variant="outline"
                onClick={() => archiveMutation.mutate(selectedItem!.id)}
                disabled={archiveMutation.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                {archiveMutation.isPending ? "Arkiverer..." : "Arkivér"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedItem(null)}>
              Luk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo preview dialog */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img src={photoPreview} alt="Forsendelse" className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm destroy dialog */}
      <Dialog open={!!confirmDestroy} onOpenChange={() => setConfirmDestroy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekræft destruering</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil destruere denne forsendelse? Handlingen kan ikke fortrydes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDestroy(null)}>
              Annuller
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
              Destruer
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
            <DialogTitle>Vælg afhentningstidspunkt</DialogTitle>
            <DialogDescription>
              Vælg dato og tidsrum for afhentning.
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
                  <SelectValue placeholder="Vælg tidsrum" />
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
              Annuller
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
              {choosePickup.isPending ? "Bestiller..." : "Bestil afhentning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MailItemLogSheet mailItemId={logMailItemId} open={!!logMailItemId} onOpenChange={(v) => { if (!v) setLogMailItemId(null); }} />
    </div>
  );
};

export default TenantDashboard;
