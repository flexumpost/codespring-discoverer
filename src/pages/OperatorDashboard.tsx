import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ScanLine, Send, UserCheck, Trash2, Building2, Plus, Upload, ImageIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables, Database } from "@/integrations/supabase/types";
import { RegisterMailDialog } from "@/components/RegisterMailDialog";
import { AssignTenantDialog } from "@/components/AssignTenantDialog";
import { ScanUploadButton } from "@/components/ScanUploadButton";
import { MailItemLogSheet } from "@/components/MailItemLogSheet";
import { cn } from "@/lib/utils";
import { getMailRowColor } from "@/lib/mailRowColor";
import { PhotoHoverPreview } from "@/components/PhotoHoverPreview";

type MailItem = Tables<"mail_items"> & { tenants?: { company_name: string; default_mail_action: string | null; default_package_action: string | null; tenant_types?: { name: string } | null } | null };

const ACTION_LABELS: Record<string, string> = {
  scan: "Scan nu",
  send: "Forsendelse",
  afhentning: "Afhentning",
  destruer: "Destruer",
  daglig: "Lig på kontoret",
  standard_forsendelse: "Standard forsendelse",
  standard_scan: "Standard scanning",
};

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

function formatDanishDateTime(date: Date): string {
  const d = date.getDate();
  const month = DANISH_MONTHS[date.getMonth()];
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${d}. ${month} kl. ${h}:${m}`;
}

function getNextThursday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 4) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntil = (4 - dayOfWeek + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil);
}

function getFirstThursdayOfMonth(refDate: Date): Date {
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const dow = first.getDay();
  const offset = (4 - dow + 7) % 7;
  return new Date(refDate.getFullYear(), refDate.getMonth(), 1 + offset);
}

function getShippingDate(tenantTypeName: string | undefined, mailType: string): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (mailType === "pakke" || (tenantTypeName ?? "").toLowerCase() !== "lite") {
    return getNextThursday();
  }

  // Lite breve → første torsdag i måneden
  const firstThurs = getFirstThursdayOfMonth(now);
  if (firstThurs >= today) return firstThurs;

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return getFirstThursdayOfMonth(nextMonth);
}

function parsePickupFromNotes(notes: string | null): string | null {
  if (!notes || !notes.startsWith("PICKUP:")) return null;
  const isoStr = notes.replace("PICKUP:", "");
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return null;
  const dayName = DANISH_DAYS[date.getDay()];
  const d = date.getDate();
  const month = DANISH_MONTHS[date.getMonth()];
  const hour = date.getHours();
  return `${dayName} den ${d}. ${month} kl. ${hour.toString().padStart(2, "0")}:00-${(hour + 1).toString().padStart(2, "0")}:00`;
}

function getOperatorStatusDisplay(item: MailItem): string {
  const action = item.chosen_action;
  if (action === "standard_scan") {
    const tenantType = item.tenants?.tenant_types?.name;
    const scanDate = getShippingDate(tenantType ?? "Lite", "brev");
    return `Scanning bestilt ${formatDanishDate(scanDate)}`;
  }
  if (action === "standard_forsendelse") {
    const shipDate = getShippingDate("Lite", "brev");
    return `Skal sendes ${formatDanishDate(shipDate)}`;
  }
  if (action === "send" || action === "under_forsendelse") {
    // Eksplicit valgt handling → altid ugentlig kadence (næste torsdag)
    const shipDate = getNextThursday();
    return `Skal sendes ${formatDanishDate(shipDate)}`;
  }
  if (action === "afhentning") {
    const pickupText = parsePickupFromNotes(item.notes);
    return pickupText ? `Afhentning bestilt ${pickupText}` : "Afhentning bestilt";
  }
  if (action === "scan") {
    if (item.scan_url) return "Scannet";
    const updated = new Date(item.updated_at);
    return `Scanning bestilt ${formatDanishDateTime(updated)}`;
  }
  if (action === "destruer") {
    const updated = new Date(item.updated_at);
    return `Destrueres - bestilt ${formatDanishDateTime(updated)}`;
  }
  if (action === "daglig") {
    const updated = new Date(item.updated_at);
    return `Lig på kontoret - ${formatDanishDateTime(updated)}`;
  }
  if (!action) {
    const defaultAction = item.mail_type === "pakke"
      ? item.tenants?.default_package_action
      : item.tenants?.default_mail_action;
    if (defaultAction === "send" || defaultAction === "under_forsendelse") {
      const shipDate = getShippingDate(item.tenants?.tenant_types?.name, item.mail_type);
      return `Skal sendes ${formatDanishDate(shipDate)}`;
    }
    if (defaultAction === "scan") {
      if (item.scan_url) return "Scannet";
      const received = new Date(item.received_at);
      return `Scanning bestilt - modtaget ${formatDanishDateTime(received)}`;
    }
    if (defaultAction === "afhentning") return "Afhentning (standard)";
    if (defaultAction === "destruer") return "Destrueres (standard)";
    if (defaultAction === "daglig") return "Lig på kontoret (standard)";
    if (defaultAction && ACTION_LABELS[defaultAction]) {
      return `${ACTION_LABELS[defaultAction]} (standard)`;
    }
  }
  return STATUS_LABELS[item.status] ?? item.status;
}

const STATUS_LABELS: Record<Database["public"]["Enums"]["mail_status"], string> = {
  ny: "Ny",
  afventer_handling: "Afventer handling",
  ulaest: "Ulæst",
  laest: "Læst",
  arkiveret: "Arkiveret",
};

type CardFilter = {
  title: string;
  icon: typeof Mail;
  color: string;
  filter: (item: MailItem) => boolean;
  countFilter?: (item: MailItem) => boolean;
};

const CARD_FILTERS: CardFilter[] = [
  {
    title: "Ikke tildelt",
    icon: UserCheck,
    color: "text-destructive",
    filter: (item) => !item.tenant_id,
  },
  {
    title: "Åben og scan",
    icon: ScanLine,
    color: "text-primary",
    filter: (item) => item.chosen_action === "scan",
    countFilter: (item) => item.chosen_action === "scan" && !item.scan_url,
  },
  {
    title: "Send",
    icon: Send,
    color: "text-primary",
    filter: (item) => item.chosen_action === "send" || item.chosen_action === "under_forsendelse",
    countFilter: (item) => item.chosen_action === "send",
  },
  {
    title: "Afhentes",
    icon: Mail,
    color: "text-primary",
    filter: (item) => item.chosen_action === "afhentning",
  },
  {
    title: "Destrueres",
    icon: Trash2,
    color: "text-destructive",
    filter: (item) => item.chosen_action === "destruer",
  },
  {
    title: "Lig på kontoret",
    icon: Building2,
    color: "text-primary",
    filter: (item) => item.chosen_action === "daglig",
  },
];

const MAIL_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { ekstraForsendelse: "50 kr.", ekstraScanning: "50 kr.", ekstraAfhentning: "50 kr." },
  Standard: { ekstraForsendelse: "Inkluderet", ekstraScanning: "30 kr.", ekstraAfhentning: "30 kr." },
  Plus: { ekstraForsendelse: "Inkluderet", ekstraScanning: "Inkluderet", ekstraAfhentning: "Inkluderet" },
};

const PACKAGE_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { haandteringsgebyr: "50 kr." },
  Standard: { haandteringsgebyr: "30 kr." },
  Plus: { haandteringsgebyr: "Inkluderet" },
};

const ACTION_TO_FEE_KEY: Record<string, string> = {
  scan: "ekstraScanning",
  send: "ekstraForsendelse",
  under_forsendelse: "ekstraForsendelse",
  afhentning: "ekstraAfhentning",
};

function getItemFee(item: MailItem, pricing: Record<string, Record<string, Record<string, string>>>): string {
  if (!item.chosen_action || !item.tenant_id) return "—";
  if (item.chosen_action === "standard_forsendelse") return "0 kr. + porto";
  if (item.chosen_action === "standard_scan") return "0 kr.";
  const tier = item.tenants?.tenant_types?.name;
  if (!tier) return "—";

  if (item.mail_type === "pakke") {
    const pkgPricing = pricing.pakke?.[tier] ?? PACKAGE_PRICING_DEFAULTS[tier];
    const fee = pkgPricing?.haandteringsgebyr;
    return fee ? fee.split("—")[0].trim() : "—";
  }

  // Brev: only charge if action differs from default
  const defaultAction = item.tenants?.default_mail_action;
  if (item.chosen_action === defaultAction) {
    // Special case: afhentning on a non-free day still costs extra
    if (item.chosen_action === "afhentning" && tier !== "Plus") {
      const pickupDate = item.notes?.startsWith("PICKUP:")
        ? new Date(item.notes.replace("PICKUP:", ""))
        : null;
      if (pickupDate && !isNaN(pickupDate.getTime())) {
        const isLite = tier === "Lite";
        const isFreeDay = isLite
          ? (() => {
              const firstThurs = getFirstThursdayOfMonth(pickupDate);
              return pickupDate.getDate() === firstThurs.getDate()
                && pickupDate.getMonth() === firstThurs.getMonth();
            })()
          : pickupDate.getDay() === 4;
        if (!isFreeDay) {
          return tier === "Standard" ? "30 kr." : "50 kr.";
        }
      }
    }
    return "—";
  }

  // Free-day check for afhentning even when it's not the default action
  if (item.chosen_action === "afhentning" && tier !== "Plus") {
    const pickupDate = item.notes?.startsWith("PICKUP:")
      ? new Date(item.notes.replace("PICKUP:", ""))
      : null;
    if (pickupDate && !isNaN(pickupDate.getTime())) {
      const isLite = tier === "Lite";
      const isFreeDay = isLite
        ? (() => {
            const firstThurs = getFirstThursdayOfMonth(pickupDate);
            return pickupDate.getDate() === firstThurs.getDate()
              && pickupDate.getMonth() === firstThurs.getMonth();
          })()
        : pickupDate.getDay() === 4;
      if (isFreeDay) return "0 kr.";
    }
  }

  const feeKey = ACTION_TO_FEE_KEY[item.chosen_action];
  if (!feeKey) return "—";

  const mailPricing = pricing.brev?.[tier] ?? MAIL_PRICING_DEFAULTS[tier];
  const fee = mailPricing?.[feeKey];
  if (!fee) return "—";
  // Extract just the price part (before "—")
  return fee.split("—")[0].trim();
}

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignTenantItem, setAssignTenantItem] = useState<MailItem | null>(null);
  const [pricing, setPricing] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [logMailItemId, setLogMailItemId] = useState<string | null>(null);

  const refreshMail = async () => {
    const { data } = await supabase
      .from("mail_items")
      .select("*, tenants(company_name, default_mail_action, default_package_action, tenant_types(name))")
      .in("status", ["ny", "afventer_handling", "ulaest", "laest"])
      .order("stamp_number", { ascending: false, nullsFirst: false });
    setMailItems(data ?? []);
  };

  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await supabase.from("pricing_settings").select("*");
      if (data) {
        const map: Record<string, Record<string, Record<string, string>>> = {};
        for (const row of data) {
          if (!map[row.category]) map[row.category] = {};
          if (!map[row.category][row.tier]) map[row.category][row.tier] = {};
          map[row.category][row.tier][row.field_key] = row.field_value;
        }
        setPricing(map);
      }
    };
    fetchPricing();
  }, []);

  useEffect(() => {
    refreshMail();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const createChannel = () => {
      if (cancelled) return;
      channel = supabase
        .channel('operator-mail-updates-' + Date.now())
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mail_items' },
          () => { refreshMail(); }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime channel error, reconnecting...', status);
            if (channel) supabase.removeChannel(channel);
            reconnectTimeout = setTimeout(() => {
              createChannel();
              refreshMail();
            }, 3000);
          }
        });
    };

    createChannel();

    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const counts = CARD_FILTERS.map((cf) => ({
    ...cf,
    count: mailItems.filter(cf.countFilter ?? cf.filter).length,
  }));

  const activeFilter = CARD_FILTERS.find((cf) => cf.title === selectedCard);
  const cardFiltered = activeFilter ? mailItems.filter(activeFilter.filter) : mailItems;
  const filteredItems = searchQuery
    ? cardFiltered.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.tenants?.company_name?.toLowerCase().includes(q) ||
          item.stamp_number?.toString().includes(q)
        );
      })
    : cardFiltered;
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.stamp_number == null) return 1;
    if (b.stamp_number == null) return -1;
    return b.stamp_number - a.stamp_number;
  });

  const handleCardClick = (title: string) => {
    setSelectedCard((prev) => (prev === title ? null : title));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Operatør-dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/bulk-upload")} className="gap-2">
            <Upload className="h-4 w-4" /> Bulk upload
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Registrer post
          </Button>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {counts.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer transition-shadow hover:shadow-md ${selectedCard === card.title ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleCardClick(card.title)}
          >
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold">{card.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 gap-4">
          <h3 className="text-lg font-semibold">{selectedCard ?? "Alle forsendelser"}</h3>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søg lejer eller nr..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        {sortedItems.length === 0 ? (
          <p className="text-muted-foreground">Ingen elementer.</p>
        ) : (
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Lejer</TableHead>
                <TableHead>Forsendelsesnr.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gebyr</TableHead>
                <TableHead>Modtaget</TableHead>
                <TableHead>Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id} className={cn(getMailRowColor(item))}>
                  <TableCell>
                    <PhotoHoverPreview photoUrl={item.photo_url} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.mail_type === "pakke" ? "secondary" : "outline"}>
                      {item.mail_type === "pakke" ? "Pakke" : "Brev"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setAssignTenantItem(item); }}
                  >
                    {item.tenants?.company_name ? (
                      <span className="text-primary hover:underline">{item.tenants.company_name}</span>
                    ) : (
                      <span className="text-destructive font-medium hover:underline">Ikke tildelt</span>
                    )}
                  </TableCell>
                  <TableCell>{item.stamp_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getOperatorStatusDisplay(item)}</Badge>
                  </TableCell>
                  <TableCell>{getItemFee(item, pricing)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-sm"
                      onClick={(e) => { e.stopPropagation(); setLogMailItemId(item.id); }}
                    >
                      {new Date(item.received_at).toLocaleDateString("da-DK")}
                    </button>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(item.chosen_action === "scan" || item.chosen_action === "standard_scan") && !(item as any).scan_url && item.tenant_id && (
                      <ScanUploadButton
                        mailItemId={item.id}
                        tenantId={item.tenant_id}
                        onUploaded={refreshMail}
                      />
                    )}
                    {(item as any).scan_url && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <ScanLine className="h-3 w-3 mr-1" /> Scannet
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RegisterMailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {assignTenantItem && (
        <AssignTenantDialog
          mailItem={assignTenantItem}
          open={!!assignTenantItem}
          onOpenChange={(v) => { if (!v) setAssignTenantItem(null); }}
          onAssigned={() => { refreshMail(); setAssignTenantItem(null); }}
        />
      )}
      <MailItemLogSheet mailItemId={logMailItemId} open={!!logMailItemId} onOpenChange={(v) => { if (!v) setLogMailItemId(null); }} />
    </div>
  );
};

export default OperatorDashboard;
