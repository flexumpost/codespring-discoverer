import { useState, useMemo } from "react";
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
import { Mail, Archive, ImageIcon, ScanLine, Download, CalendarIcon, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMailRowColor } from "@/lib/mailRowColor";
import { ScanThumbnail } from "@/components/ScanThumbnail";
import { toast } from "sonner";
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
  scan: "Åben og scan",
  send: "Send",
  afhentning: "Afhentning",
  destruer: "Destruer",
  daglig: "Lig på kontoret",
};

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

/** First Thursday of the month AFTER today */
function getFirstThursdayOfNextMonth(): Date {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = (now.getMonth() + 1) % 12;
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay(); // 0=Sun
  const offset = (4 - dayOfWeek + 7) % 7; // days until Thursday
  return new Date(year, month, 1 + offset);
}

/** The upcoming Thursday (if today is Thursday, return today) */
function getNextThursday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntil = (4 - dayOfWeek + 7) % 7 || 7; // if today is Thu use next
  const d = new Date(now);
  if (dayOfWeek === 4) return d; // today is Thursday
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function getNextShippingDate(tenantType: string | undefined, mailType: string): Date {
  if (tenantType === "Lite" && mailType === "brev") {
    return getFirstThursdayOfNextMonth();
  }
  return getNextThursday();
}

/* ── Pickup helpers ── */

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

function getStatusDisplay(
  item: { chosen_action: string | null; scan_url: string | null; status: string; mail_type: string; notes: string | null },
  tenantTypeName: string | undefined
): [string, string?] {
  if (item.chosen_action === "scan" && !item.scan_url) {
    return ["Afventer scanning", "Scannes inden for 24 timer"];
  }
  if (item.chosen_action === "scan" && item.scan_url) {
    return [STATUS_LABELS[item.status as MailStatus] ?? item.status];
  }
  if (item.chosen_action === "send") {
    const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
    return ["Sendes på næste forsendelsesdag", formatDanishDate(nextDate)];
  }
  if (item.chosen_action === "afhentning") {
    const pickupText = parsePickupFromNotes(item.notes);
    return ["Bestilt afhentning", pickupText ?? undefined];
  }
  if (item.chosen_action === "destruer") {
    return ["Destrueret"];
  }
  if (item.chosen_action === "daglig") {
    return ["Lægges på kontoret"];
  }
  // No action chosen
  if (tenantTypeName === "Fastlejer") {
    return ["Lægges på kontoret"];
  }
  if (["Lite", "Standard", "Plus"].includes(tenantTypeName ?? "")) {
    const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
    return ["Sendes på næste forsendelsesdag", formatDanishDate(nextDate)];
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

      const [nyRes, ulaestRes, laestRes, arkiveretRes] = await Promise.all([
        base("ny"),
        base("ulaest"),
        base("laest"),
        base("arkiveret"),
      ]);
      return {
        ny: nyRes.count ?? 0,
        afventer_scanning: scanPendingRes.count ?? 0,
        ulaest: ulaestRes.count ?? 0,
        laest: laestRes.count ?? 0,
        arkiveret: arkiveretRes.count ?? 0,
      };
    },
  });

  // Fetch mail items filtered by selected tenant
  const { data: mailItems = [], isLoading } = useQuery({
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
        query = query.in("status", ["ulaest", "laest"] as MailStatus[]);
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
        .update({ chosen_action: action, status: "afventer_handling" as MailStatus })
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
    if (action === "afhentning") {
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
          notes: `PICKUP:${pickupIso}`,
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

  const handleRowClick = (item: MailItem) => {
    setSelectedItem(item);
    // Do NOT auto-mark as read here — only on scan download
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
    { title: "Scannet post", value: stats.ulaest + stats.laest, icon: FileCheck, status: "scannet" as FilterStatus },
    { title: "Arkiveret", value: stats.arkiveret, icon: Archive, status: "arkiveret" as FilterStatus },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Min post</h2>
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
      </div>

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
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt="Foto"
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
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
                <TableCell>{item.stamp_number ?? "—"}</TableCell>
                <TableCell>{item.sender_name ?? "—"}</TableCell>
                <TableCell>
                  {(() => {
                    const [line1, line2] = getStatusDisplay(item, tenantTypeName);
                    return (
                      <div>
                        <Badge variant="outline">{line1}</Badge>
                        {line2 && <p className="text-[11px] text-muted-foreground mt-1">{line2}</p>}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {item.status !== "arkiveret" && allowedActions.length > 0 ? (
                    <Select
                      value={item.chosen_action ?? undefined}
                      onValueChange={(value) => handleAction(item.id, value)}
                      disabled={chooseAction.isPending}
                    >
                      <SelectTrigger className="h-8 w-[140px] sm:w-[180px] text-xs">
                        <SelectValue placeholder="Vælg handling" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {allowedActions
                          .filter((action) => !(item.mail_type === "pakke" && action === "scan"))
                          .map((action) => (
                          <SelectItem key={action} value={action} className="text-xs">
                            {ACTION_LABELS[action] ?? action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.chosen_action ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      {ACTION_LABELS[item.chosen_action] ?? item.chosen_action}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.scan_url ? (
                    <ScanThumbnail scanUrl={item.scan_url} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{new Date(item.received_at).toLocaleDateString("da-DK")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Forsendelsesdetaljer</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.photo_url && (
                <img
                  src={selectedItem.photo_url}
                  alt="Forsendelse"
                  className="w-full rounded border"
                />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                    const [line1, line2] = getStatusDisplay(selectedItem, tenantTypeName);
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
              {selectedItem.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Noter fra operatør</span>
                  <p className="mt-1 rounded bg-muted p-3">{selectedItem.notes}</p>
                </div>
              )}
              {selectedItem.scan_url && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Scanning</span>
                  <div className="mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={handleDownloadScan}
                    >
                      <Download className="h-4 w-4" />
                      Download scanning
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
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
    </div>
  );
};

export default TenantDashboard;
