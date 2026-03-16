import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus, Mail } from "lucide-react";
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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
};

const TenantsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tenantTypeId, setTenantTypeId] = useState("");
  const [sendWelcomeOnCreate, setSendWelcomeOnCreate] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());

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

  const sendWelcomeEmail = async (tenantIds: string[]) => {
    const { data, error } = await supabase.functions.invoke("send-welcome-email", {
      body: { tenant_ids: tenantIds },
    });
    if (error) throw error;
    return data;
  };

  const sendWelcomeMutation = useMutation({
    mutationFn: (tenantIds: string[]) => sendWelcomeEmail(tenantIds),
    onSuccess: (data) => {
      const results = data?.results ?? [];
      const sent = results.filter((r: any) => r.status === "sent").length;
      const skipped = results.filter((r: any) => r.status === "skipped").length;
      const failed = results.filter((r: any) => r.status === "failed").length;
      
      if (sent > 0) toast.success(`Velkomst e-mail sendt til ${sent} lejer(e)`);
      if (skipped > 0) toast.info(`${skipped} lejer(e) sprunget over (mangler e-mail)`);
      if (failed > 0) toast.error(`${failed} afsendelse(r) fejlede`);
      
      setSelectedTenantIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
    },
    onError: (err: Error) => {
      toast.error("Kunne ikke sende velkomst e-mail: " + err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("tenants").insert({
        company_name: companyName.trim(),
        contact_email: contactEmail.trim() || null,
        tenant_type_id: tenantTypeId,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      toast.success("Lejer oprettet");

      // Auto-invite: if email is provided, send invite so the tenant can set their own password
      const email = contactEmail.trim();
      if (email && data?.id) {
        try {
          const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
            "create-tenant-user",
            {
              body: {
                email,
                full_name: companyName.trim(),
                tenant_ids: [data.id],
                mode: "invite",
              },
            }
          );
          if (inviteError) throw inviteError;
          toast.success("Invitation sendt til " + email);
        } catch (err: any) {
          toast.error("Kunne ikke sende invitation: " + (err?.message || err));
        }
      }

      if (sendWelcomeOnCreate && data?.id) {
        sendWelcomeMutation.mutate([data.id]);
      }

      setDialogOpen(false);
      setCompanyName("");
      setContactEmail("");
      setTenantTypeId("");
      setSendWelcomeOnCreate(false);
    },
    onError: (err: Error) => {
      toast.error("Kunne ikke oprette lejer: " + err.message);
    },
  });

  const canSubmit = companyName.trim() && tenantTypeId;
  
  const allSelected = tenants.length > 0 && tenants.every(t => selectedTenantIds.has(t.id));
  const someSelected = tenants.some(t => selectedTenantIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTenantIds(new Set());
    } else {
      setSelectedTenantIds(new Set(tenants.map(t => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedTenantIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Lejere</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => sendWelcomeMutation.mutate(Array.from(selectedTenantIds))}
            disabled={selectedTenantIds.size === 0 || sendWelcomeMutation.isPending}
          >
            <Mail className="h-4 w-4 mr-1" />
            {sendWelcomeMutation.isPending ? "Sender..." : "Send velkomst e-mail"}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Opret ny lejer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Vælg alle"
                  />
                </TableHead>
                <TableHead>Lejer navn</TableHead>
                <TableHead>Lejertype</TableHead>
                <TableHead>Velkomst e-mail</TableHead>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedTenantIds.has(tenant.id)}
                        onCheckedChange={() => toggleOne(tenant.id)}
                        aria-label={`Vælg ${tenant.company_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{tenant.company_name}</TableCell>
                    <TableCell>
                      {typeName && (
                        <Badge variant="outline" className={TYPE_COLORS[typeName] ?? ""}>
                          {typeName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.welcome_email_sent_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(tenant.welcome_email_sent_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="send_welcome"
                checked={sendWelcomeOnCreate}
                onCheckedChange={(checked) => setSendWelcomeOnCreate(checked === true)}
              />
              <Label htmlFor="send_welcome" className="cursor-pointer">
                Send velkomst e-mail
              </Label>
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
