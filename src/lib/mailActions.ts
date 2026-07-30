import type { TFunction } from "i18next";
import { ScanLine, Send, Hand, Trash2, Archive, Undo2, Zap, Calendar as CalendarIcon } from "lucide-react";
import type { ActionCard } from "@/components/ChooseActionDialog";

/* ── Date helpers (kept here so both TenantDashboard and the action dialog use the same source) ── */

export function getFirstThursdayOfMonth(): Date {
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

export function getNextThursday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntil = (4 - dayOfWeek + 7) % 7;
  const d = new Date(now);
  d.setDate(d.getDate() + daysUntil);
  return d;
}

export function formatI18nDate(date: Date, t: TFunction): string {
  const days = t("dates.days", { returnObjects: true }) as unknown as string[];
  const months = t("dates.months", { returnObjects: true }) as unknown as string[];
  const day = days[date.getDay()];
  const d = date.getDate();
  const month = months[date.getMonth()];
  const the = t("dates.the");
  return the ? `${day} ${the} ${d}. ${month}` : `${day} ${d}. ${month}`;
}

/* ── Completion state ── */

/** True when a mail item has been fully handled (sent, scanned, picked up or destroyed) and may be archived. */
export function isMailCompleted(item: {
  chosen_action: string | null;
  scan_url: string | null;
  status: string;
}): boolean {
  return (
    item.status === "sendt_med_dao" ||
    item.status === "sendt_med_postnord" ||
    item.status === "sendt_retur" ||
    !!item.scan_url ||
    item.chosen_action === "afhentet" ||
    item.chosen_action === "destruer"
  );
}

/* ── Action card builder ── */


type Tier = "Lite" | "Standard" | "Plus" | string | undefined;

interface BuildCardsInput {
  item: {
    chosen_action: string | null;
    scan_url: string | null;
    status: string;
    mail_type: string;
  };
  tier: Tier;
  t: TFunction;
}

/** Maps a logical "card kind" to the chosen_action value the system expects, per tier. */
function actionValue(kind: string, tier: Tier, mailType: string): string | null {
  if (kind === "standard_scan") return tier === "Plus" ? null : "standard_scan";
  if (kind === "scan_now") return "scan";
  if (kind === "standard_send") {
    if (tier === "Lite") return "standard_forsendelse";
    return "send"; // Standard + Plus: "send" is the free standard option
  }
  if (kind === "fast_send") return tier === "Lite" ? "send" : null; // only Lite has separate fast send
  if (kind === "standard_pickup") {
    if (tier === "Lite") return mailType === "pakke" ? "afhentning" : "gratis_afhentning";
    return "afhentning"; // Standard auto-sets next Thursday; Plus standard pickup
  }
  if (kind === "fast_pickup") {
    if (tier === "Standard" || tier === "Plus") return "anden_afhentningsdag";
    return "afhentning"; // Lite: "afhentning" with custom date
  }
  if (kind === "destroy") return "destruer";
  return null;
}

function priceFor(kind: string, tier: Tier, mailType: string, t: TFunction): string {
  if (kind === "destroy") return "0 kr.";
  if (mailType === "pakke") {
    const prices: Record<string, { fee: string; feePorto: string }> = {
      Lite: { fee: "50 kr.", feePorto: "50 kr. + porto" },
      Standard: { fee: "30 kr.", feePorto: "30 kr. + porto" },
      Plus: { fee: "10 kr.", feePorto: "10 kr. + porto" },
    };
    const p = prices[tier ?? ""] ?? prices.Lite;
    if (kind === "standard_send" || kind === "fast_send") return p.feePorto;
    if (kind === "standard_pickup" || kind === "fast_pickup") return p.fee;
    return p.fee;
  }
  if (tier === "Plus") return "0 kr.";
  if (tier === "Lite") {
    if (kind === "standard_scan") return "0 kr.";
    if (kind === "scan_now") return "50 kr.";
    if (kind === "standard_send") return "0 kr. + porto";
    if (kind === "fast_send") return "50 kr. + porto";
    if (kind === "standard_pickup") return "0 kr.";
    if (kind === "fast_pickup") return "50 kr.";
  }
  if (tier === "Standard") {
    if (kind === "standard_scan") return "0 kr.";
    if (kind === "scan_now") return "30 kr.";
    if (kind === "standard_send") return "0 kr. + porto";
    if (kind === "standard_pickup") return "0 kr.";
    if (kind === "fast_pickup") return "30 kr.";
  }
  return "—";
}

const COLOR_SCAN = "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800";
const COLOR_SEND = "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800";
const COLOR_PICKUP = "bg-pink-50 border-pink-300 dark:bg-pink-950/30 dark:border-pink-800";
const COLOR_DESTROY = "bg-red-50 border-red-400 dark:bg-red-950/30 dark:border-red-800";
const COLOR_ARCHIVE = "bg-gray-50 border-gray-300 dark:bg-gray-900/30 dark:border-gray-700";
const COLOR_REACTIVATE = "bg-sky-50 border-sky-300 dark:bg-sky-950/30 dark:border-sky-800";

function makeCard(
  kind: string,
  tier: Tier,
  mailType: string,
  t: TFunction,
  opts: { datePrefix?: string; date?: Date } = {},
): ActionCard | null {
  const action = actionValue(kind, tier, mailType);
  if (!action) return null;
  const price = priceFor(kind, tier, mailType, t);
  const isPackage = mailType === "pakke";
  /** Package-specific copy with fallback to the generic (letter) text. */
  const tk = (path: string): string =>
    isPackage
      ? t(`chooseActionPackage.${path}`, { defaultValue: t(`chooseAction.${path}`) })
      : t(`chooseAction.${path}`);
  const dateText = opts.date && opts.datePrefix
    ? `${opts.datePrefix} ${formatI18nDate(opts.date, t)}`
    : undefined;



  switch (kind) {
    case "standard_scan":
      return {
        key: kind, action, price,
        title: t("chooseAction.standardScan.title"),
        description: t("chooseAction.standardScan.desc"),
        dateText,
        color: COLOR_SCAN, icon: ScanLine,
        ctaLabel: t("chooseAction.standardScan.cta"),
      };
    case "scan_now":
      return {
        key: kind, action, price,
        title: t("chooseAction.scanNow.title"),
        description: t("chooseAction.scanNow.desc"),
        color: COLOR_SCAN, icon: Zap,
        ctaLabel: t("chooseAction.scanNow.cta"),
      };
    case "standard_send":
      return {
        key: kind, action, price,
        title: t("chooseAction.standardSend.title"),
        description: t("chooseAction.standardSend.desc"),
        dateText,
        color: COLOR_SEND, icon: Send,
        ctaLabel: t("chooseAction.standardSend.cta"),
      };
    case "fast_send":
      return {
        key: kind, action, price,
        title: t("chooseAction.fastSend.title"),
        description: t("chooseAction.fastSend.desc"),
        dateText,
        color: COLOR_SEND, icon: Zap,
        ctaLabel: t("chooseAction.fastSend.cta"),
      };
    case "standard_pickup":
      return {
        key: kind, action, price,
        title: t("chooseAction.standardPickup.title"),
        description: t("chooseAction.standardPickup.desc"),
        dateText,
        color: COLOR_PICKUP, icon: Hand,
        ctaLabel: t("chooseAction.standardPickup.cta"),
      };
    case "fast_pickup":
      return {
        key: kind, action, price,
        title: t("chooseAction.fastPickup.title"),
        description: t("chooseAction.fastPickup.desc"),
        color: COLOR_PICKUP, icon: CalendarIcon,
        ctaLabel: t("chooseAction.fastPickup.cta"),
      };
    case "destroy":
      return {
        key: kind, action, price,
        title: t("chooseAction.destroy.title"),
        description: t("chooseAction.destroy.desc"),
        color: COLOR_DESTROY, icon: Trash2, destructive: true,
        ctaLabel: t("chooseAction.destroy.cta"),
      };
  }
  return null;
}

function specialArchive(t: TFunction): ActionCard {
  return {
    key: "archive", action: "__archive__",
    title: t("chooseAction.archive.title"),
    description: t("chooseAction.archive.desc"),
    price: "0 kr.",
    color: COLOR_ARCHIVE, icon: Archive,
    ctaLabel: t("chooseAction.archive.cta"),
  };
}

function specialReactivate(t: TFunction): ActionCard {
  return {
    key: "reactivate", action: "__reactivate__",
    title: t("chooseAction.reactivate.title"),
    description: t("chooseAction.reactivate.desc"),
    price: "0 kr.",
    color: COLOR_REACTIVATE, icon: Undo2,
    ctaLabel: t("chooseAction.reactivate.cta"),
  };
}

function specialCancel(t: TFunction): ActionCard {
  return {
    key: "cancel", action: "__cancel__",
    title: t("chooseAction.cancel.title"),
    description: t("chooseAction.cancel.desc"),
    price: "—",
    color: COLOR_ARCHIVE, icon: Undo2,
    ctaLabel: t("chooseAction.cancel.cta"),
  };
}

/** Returns the cards to show in the "Vælg handling" dialog for a given mail item. */
export function buildActionCards({ item, tier, t }: BuildCardsInput): ActionCard[] {
  const isLetter = item.mail_type !== "pakke";
  const isArchived = item.status === "arkiveret";
  const isSent =
    item.status === "sendt_med_dao" ||
    item.status === "sendt_med_postnord" ||
    item.status === "sendt_retur";
  const isPickedUp = item.chosen_action === "afhentet";
  const isDestroyedDone = isArchived && item.chosen_action === "destruer";
  const isScanned = !!item.scan_url && !isArchived && !isSent;
  const hasPendingChoice = !!item.chosen_action && !isArchived && !isSent && !isPickedUp && !item.scan_url;

  // Helper: build a list of kinds, dropping nulls
  const compact = (...kinds: (ActionCard | null)[]): ActionCard[] =>
    kinds.filter((c): c is ActionCard => !!c);

  // 1. Archived → just reactivate
  if (isArchived) {
    if (isDestroyedDone) return []; // cannot reactivate destroyed items
    return [specialReactivate(t)];
  }

  // 2. Sent / picked up → archive
  if (isSent || isPickedUp) {
    return [specialArchive(t)];
  }

  // 3. Packages
  if (!isLetter) {
    if (isScanned) {
      // packages aren't scanned, but in case → archive
      return [specialArchive(t)];
    }
    const cards = compact(
      makeCard("standard_send", tier, "pakke", t, {
        datePrefix: t("statusDisplay.sentLatest"),
        date: getNextThursday(),
      }),
      makeCard("standard_pickup", tier, "pakke", t),
      makeCard("destroy", tier, "pakke", t),
    );
    if (hasPendingChoice) {
      const filtered = cards.filter((c) => c.action !== item.chosen_action);
      return [...filtered, specialCancel(t)];
    }
    return cards;
  }

  // 4. Letters
  if (isScanned) {
    // already scanned but not sent/picked up → send/pickup/destroy
    const cards = compact(
      makeCard("standard_send", tier, "brev", t, {
        datePrefix: t("chooseAction.standardSend.datePrefix"),
        date: getFirstThursdayOfMonth(),
      }),
      makeCard("fast_send", tier, "brev", t, {
        datePrefix: t("chooseAction.fastSend.datePrefix"),
        date: getNextThursday(),
      }),
      makeCard("standard_pickup", tier, "brev", t, {
        datePrefix: t("chooseAction.standardPickup.datePrefix"),
        date: tier === "Lite" ? getFirstThursdayOfMonth() : getNextThursday(),
      }),
      makeCard("fast_pickup", tier, "brev", t),
      makeCard("destroy", tier, "brev", t),
    );
    return [...cards, specialArchive(t)];
  }

  // Default letter (new / pending)
  const cards = compact(
    makeCard("standard_scan", tier, "brev", t, {
      datePrefix: t("chooseAction.standardScan.datePrefix"),
      date: tier === "Lite" ? getFirstThursdayOfMonth() : getNextThursday(),
    }),
    makeCard("scan_now", tier, "brev", t),
    makeCard("standard_send", tier, "brev", t, {
      datePrefix: t("chooseAction.standardSend.datePrefix"),
      date: getFirstThursdayOfMonth(),
    }),
    makeCard("fast_send", tier, "brev", t, {
      datePrefix: t("chooseAction.fastSend.datePrefix"),
      date: getNextThursday(),
    }),
    makeCard("standard_pickup", tier, "brev", t, {
      datePrefix: t("chooseAction.standardPickup.datePrefix"),
      date: tier === "Lite" ? getFirstThursdayOfMonth() : getNextThursday(),
    }),
    makeCard("fast_pickup", tier, "brev", t),
    makeCard("destroy", tier, "brev", t),
  );

  if (hasPendingChoice) {
    const filtered = cards.filter((c) => c.action !== item.chosen_action);
    return [...filtered, specialCancel(t)];
  }
  return cards;
}
