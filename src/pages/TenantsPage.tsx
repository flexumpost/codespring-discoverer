import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const TYPE_ORDER = ["Fastlejer", "Lite", "Standard", "Plus", "Retur til afsender", "Nabo"];

const TenantsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tenantTypeId, setTenantTypeId] = useState("");

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name)")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: tenantTypes = [] } = useQuery({
    queryKey: ["tenant-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_types").select("id, name");
      if (error) throw error;
      return (data ?? []).sort(
        (a, b) => TYPE_ORDER.indexOf(a.name) - TYPE_ORDER.indexOf(b.name)
      );
    },
  });

  const { data: newMailCounts = {} } = useQuery({
    queryKey: ["new-mail-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("tenant_id")
        .eq("status", "ny")
        .not("tenant_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const item of data) {
        if (item.tenant_id) {
          counts[item.tenant_id] = (counts[item.tenant_id] || 0) + 1;
        }
      }
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").insert({
        company_name: companyName.trim(),
        contact_email: contactEmail.trim() || null,
        tenant_type_id: tenantTypeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      toast.success("Lejer oprettet");
      setDialogOpen(false);
      setCompanyName("");
      setContactEmail("");
      setTenantTypeId("");
    },
    onError: (err: Error) => {
      toast.error("Kunne ikke oprette lejer: " + err.message);
    },
  });

  const canSubmit = companyName.trim() && tenantTypeId;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Lejere</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Opret ny lejer
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lejer navn</TableHead>
                <TableHead>Lejertype</TableHead>
                <TableHead className="text-right">Nye breve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const typeName = (tenant.tenant_types as any)?.name as string | undefined;
                const newCount = newMailCounts[tenant.id] ?? 0;
                return (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium">{tenant.company_name}</TableCell>
                    <TableCell>
                      {typeName && (
                        <Badge variant="outline" className={TYPE_COLORS[typeName] ?? ""}>
                          {typeName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {newCount > 0 ? (
                        <Badge variant="destructive">{newCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Ingen lejere fundet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opret ny lejer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Virksomhedsnavn *</Label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Indtast virksomhedsnavn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Kontakt email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@eksempel.dk"
              />
            </div>
            <div className="space-y-2">
              <Label>Lejertype *</Label>
              <Select value={tenantTypeId} onValueChange={setTenantTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg lejertype" />
                </SelectTrigger>
                <SelectContent>
                  {tenantTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuller
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? "Opretter..." : "Opret lejer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TenantsPage;
