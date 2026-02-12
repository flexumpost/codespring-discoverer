import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ScanLine, Send, UserCheck, Trash2, Building2, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

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
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

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
      <h2 className="text-2xl font-bold mb-6">Operatør-dashboard</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {counts.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedCard(card.title)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperatorDashboard;
