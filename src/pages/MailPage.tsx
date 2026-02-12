import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ImageIcon, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RegisterMailDialog } from "@/components/RegisterMailDialog";
import type { Tables, Database } from "@/integrations/supabase/types";

type MailItem = Tables<"mail_items"> & { tenants?: { company_name: string } | null };

const STATUS_LABELS: Record<Database["public"]["Enums"]["mail_status"], string> = {
  ny: "Ny",
  afventer_handling: "Afventer handling",
  ulaest: "Ulæst",
  laest: "Læst",
  arkiveret: "Arkiveret",
};

const MailPage = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: mailItems = [], isLoading } = useQuery({
    queryKey: ["mail-items", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("mail_items")
        .select("*, tenants(company_name)")
        .order("received_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter as Database["public"]["Enums"]["mail_status"]);
      if (typeFilter !== "all") query = query.eq("mail_type", typeFilter as Database["public"]["Enums"]["mail_type"]);

      const { data, error } = await query;
      if (error) throw error;
      return data as MailItem[];
    },
  });

  return (
    <AppLayout>
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Post</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/bulk-upload")} className="gap-2">
            <Upload className="h-4 w-4" /> Bulk upload
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Registrer post
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            <SelectItem value="ny">Ny</SelectItem>
            <SelectItem value="afventer_handling">Afventer handling</SelectItem>
            <SelectItem value="ulaest">Ulæst</SelectItem>
            <SelectItem value="laest">Læst</SelectItem>
            <SelectItem value="arkiveret">Arkiveret</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typer</SelectItem>
            <SelectItem value="brev">Brev</SelectItem>
            <SelectItem value="pakke">Pakke</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : mailItems.length === 0 ? (
        <p className="text-muted-foreground">Ingen post fundet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lejer</TableHead>
              <TableHead>Forsendelsesnr.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modtaget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mailItems.map((item) => (
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
                <TableCell>{item.tenants?.company_name ?? "Ikke tildelt"}</TableCell>
                <TableCell>{item.stamp_number ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
                </TableCell>
                <TableCell>{new Date(item.received_at).toLocaleDateString("da-DK")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RegisterMailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
    </AppLayout>
  );
};

export default MailPage;
