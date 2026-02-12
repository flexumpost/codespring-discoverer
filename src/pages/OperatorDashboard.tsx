import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ScanLine, Send, UserCheck, Trash2, Building2, ArrowLeft, Plus, Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { RegisterMailDialog } from "@/components/RegisterMailDialog";

type MailItem = Tables<"mail_items"> & { tenants?: { company_name: string } | null };

type CardFilter = {
  title: string;
  icon: typeof Mail;
  color: string;
  filter: (item: MailItem) => boolean;
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
  },
  {
    title: "Send",
    icon: Send,
    color: "text-primary",
    filter: (item) => item.chosen_action === "videresend",
  },
  {
    title: "Afhentes",
    icon: Mail,
    color: "text-primary",
    filter: (item) => item.chosen_action === "opbevar",
  },
  {
    title: "Destrueres",
    icon: Trash2,
    color: "text-destructive",
    filter: (item) => item.chosen_action === "destruer",
  },
  {
    title: "Lægges på kontoret",
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

  useEffect(() => {
    const fetchMail = async () => {
      const { data } = await supabase
        .from("mail_items")
        .select("*, tenants(company_name)")
        .in("status", ["ny", "afventer_handling"]);
      setMailItems(data ?? []);
    };
    fetchMail();
  }, []);

  const counts = CARD_FILTERS.map((cf) => ({
    ...cf,
    count: mailItems.filter(cf.filter).length,
  }));

  const activeFilter = CARD_FILTERS.find((cf) => cf.title === selectedCard);
  const filteredItems = activeFilter ? mailItems.filter(activeFilter.filter) : [];

  if (selectedCard && activeFilter) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setSelectedCard(null)}>
          <ArrowLeft className="h-4 w-4" /> Tilbage til oversigt
        </Button>
        <h2 className="text-2xl font-bold mb-4">{selectedCard}</h2>
        {filteredItems.length === 0 ? (
          <p className="text-muted-foreground">Ingen elementer.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Afsender</TableHead>
                <TableHead>Lejer</TableHead>
                <TableHead>Stempel nr.</TableHead>
                <TableHead>Modtaget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.mail_type === "pakke" ? "secondary" : "outline"}>
                      {item.mail_type === "pakke" ? "Pakke" : "Brev"}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.sender_name ?? "—"}</TableCell>
                  <TableCell>{item.tenants?.company_name ?? "Ikke tildelt"}</TableCell>
                  <TableCell>{item.stamp_number ?? "—"}</TableCell>
                  <TableCell>{new Date(item.received_at).toLocaleDateString("da-DK")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Operatør-dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/bulk-upload")} className="gap-2">
            <Upload className="h-4 w-4" /> Bulk upload
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Registrer post
          </Button>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
        {counts.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedCard(card.title)}
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
      <RegisterMailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default OperatorDashboard;
