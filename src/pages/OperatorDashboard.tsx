import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ScanLine, Send, UserCheck, Trash2, Building2, Plus, Upload, ImageIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables, Database } from "@/integrations/supabase/types";
import { RegisterMailDialog } from "@/components/RegisterMailDialog";
import { ScanUploadButton } from "@/components/ScanUploadButton";

type MailItem = Tables<"mail_items"> & { tenants?: { company_name: string } | null };

const DANISH_DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const DANISH_MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

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
    filter: (item) => item.chosen_action === "send",
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

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshMail = async () => {
    const { data } = await supabase
      .from("mail_items")
      .select("*, tenants(company_name)")
      .in("status", ["ny", "afventer_handling", "ulaest", "laest"]);
    setMailItems(data ?? []);
  };

  useEffect(() => {
    refreshMail();

    const channel = supabase
      .channel('operator-mail-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mail_items' },
        () => { refreshMail(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = CARD_FILTERS.map((cf) => ({
    ...cf,
    count: mailItems.filter(cf.countFilter ?? cf.filter).length,
  }));

  const activeFilter = CARD_FILTERS.find((cf) => cf.title === selectedCard);
  const filteredItems = activeFilter ? mailItems.filter(activeFilter.filter) : mailItems;
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.stamp_number == null) return 1;
    if (b.stamp_number == null) return -1;
    return a.stamp_number - b.stamp_number;
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
        <h3 className="text-lg font-semibold mb-3">{selectedCard ?? "Alle forsendelser"}</h3>
        {sortedItems.length === 0 ? (
          <p className="text-muted-foreground">Ingen elementer.</p>
        ) : (
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Afsender</TableHead>
                <TableHead>Lejer</TableHead>
                <TableHead>Forsendelsesnr.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modtaget</TableHead>
                <TableHead>Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.photo_url ? (
                      <img src={item.photo_url} alt="Foto" className="h-10 w-10 rounded object-cover" />
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
                  <TableCell>{item.sender_name ?? "—"}</TableCell>
                  <TableCell>{item.tenants?.company_name ?? "Ikke tildelt"}</TableCell>
                  <TableCell>{item.stamp_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
                    {item.chosen_action === "afhentning" && (() => {
                      const pickupText = parsePickupFromNotes(item.notes);
                      return pickupText ? (
                        <p className="text-[11px] text-muted-foreground mt-1">{pickupText}</p>
                      ) : null;
                    })()}
                  </TableCell>
                  <TableCell>{new Date(item.received_at).toLocaleDateString("da-DK")}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {item.chosen_action === "scan" && !(item as any).scan_url && item.tenant_id && (
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
    </div>
  );
};

export default OperatorDashboard;
