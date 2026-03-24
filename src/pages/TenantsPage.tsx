import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tenantTypeId, setTenantTypeId] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnpaid, setFilterUnpaid] = useState(false);

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
      
      if (sent > 0) toast.success(t("tenants.welcomeEmailSentCount", { count: sent }));
      if (skipped > 0) toast.info(t("tenants.skippedCount", { count: skipped }));
      if (failed > 0) toast.error(t("tenants.failedCount", { count: failed }));
      
      setSelectedTenantIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
    },
    onError: (err: Error) => {
      toast.error(t("tenants.couldNotSendWelcome") + ": " + err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("tenants").insert({
        company_name: companyName.trim(),
        contact_first_name: contactFirstName.trim() || null,
        contact_last_name: contactLastName.trim() || null,
        contact_email: contactEmail.trim() || null,
        tenant_type_id: tenantTypeId,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      toast.success(t("tenants.tenantCreated"));

      const email = contactEmail.trim();
      if (email && data?.id) {
        try {
          const { error: inviteError } = await supabase.functions.invoke(
            "create-tenant-user",
            { body: { email, first_name: contactFirstName.trim() || companyName.trim(), last_name: contactLastName.trim() || "", tenant_ids: [data.id], mode: "invite" } }
          );
          if (inviteError) throw inviteError;
          toast.success(t("tenants.welcomeEmailSent", { email }));
        } catch (err: any) {
          toast.error(t("tenants.couldNotCreateUser") + ": " + (err?.message || err));
        }
      }

      setDialogOpen(false);
      setCompanyName("");
      setContactFirstName("");
      setContactLastName("");
      setContactEmail("");
      setTenantTypeId("");
    },
    onError: (err: Error) => {
      toast.error(t("tenants.couldNotCreateTenant") + ": " + err.message);
    },
  });

  const canSubmit = companyName.trim() && tenantTypeId;

  const typeCounts = useMemo(() => {
    const counts = { Lite: 0, Standard: 0, Plus: 0 };
    tenants.forEach(t => {
      const name = t.tenant_types?.name;
      if (name && name in counts) counts[name as keyof typeof counts]++;
    });
    return counts;
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = !searchQuery || t.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnpaid = !filterUnpaid || t.has_unpaid_invoice;
      return matchesSearch && matchesUnpaid;
    });
  }, [tenants, searchQuery, filterUnpaid]);

  const allSelected = filteredTenants.length > 0 && filteredTenants.every(t => selectedTenantIds.has(t.id));
  const someSelected = filteredTenants.some(t => selectedTenantIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTenantIds(new Set());
    } else {
      setSelectedTenantIds(new Set(filteredTenants.map(t => t.id)));
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
        <h2 className="text-2xl font-bold">{t("tenants.title")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => sendWelcomeMutation.mutate(Array.from(selectedTenantIds))} disabled={selectedTenantIds.size === 0 || sendWelcomeMutation.isPending}>
            <Mail className="h-4 w-4 mr-1" />
            {sendWelcomeMutation.isPending ? t("common.sending") : t("tenants.sendWelcomeEmail")}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("tenants.createNewTenant")}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder={t("tenants.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-unpaid"
            checked={filterUnpaid}
            onCheckedChange={(checked) => setFilterUnpaid(!!checked)}
          />
          <Label htmlFor="filter-unpaid" className="text-sm font-normal cursor-pointer whitespace-nowrap">
            {t("tenants.unpaidInvoice")}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-[10px]">
        {(["Lite", "Standard", "Plus"] as const).map((type) => {
          const total = typeCounts.Lite + typeCounts.Standard + typeCounts.Plus;
          const pct = total > 0 ? Math.round((typeCounts[type] / total) * 100) : 0;
          return (
            <Badge key={type} variant="outline" className={`${TYPE_COLORS[type]} text-xs`}>
              {type}: {typeCounts[type]} ({pct}%)
            </Badge>
          );
        })}
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
                <TableHead>Ubetalt faktura</TableHead>
                <TableHead className="text-right">Nye breve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => {
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={!!(tenant as any).has_unpaid_invoice}
                        onCheckedChange={async (checked) => {
                          const newVal = !!checked;
                          const { error: updateErr } = await supabase
                            .from("tenants")
                            .update({ has_unpaid_invoice: newVal } as any)
                            .eq("id", tenant.id);
                          if (updateErr) {
                            toast.error("Kunne ikke opdatere status");
                            return;
                          }
                          // Send email notification
                          supabase.functions.invoke("send-new-mail-email", {
                            body: {
                              tenant_id: tenant.id,
                              template_slug: newVal ? "invoice_unpaid" : "invoice_paid",
                            },
                          }).then(({ error: emailErr }) => {
                            if (emailErr) {
                              console.error("Invoice email error:", emailErr);
                            }
                          });
                          // If unchecking, recalculate overdue shipping dates
                          if (!newVal) {
                            const now = new Date();
                            const nextThurs = (() => {
                              const d = new Date();
                              const day = d.getDay();
                              const daysUntil = (4 - day + 7) % 7 || 7;
                              d.setDate(d.getDate() + daysUntil);
                              d.setHours(0, 0, 0, 0);
                              return d;
                            })();
                            const { data: overdueItems } = await supabase
                              .from("mail_items")
                              .select("id, pickup_date")
                              .eq("tenant_id", tenant.id)
                              .not("status", "in", "(arkiveret,sendt_med_dao,sendt_med_postnord)")
                              .not("pickup_date", "is", null)
                              .lt("pickup_date", now.toISOString());
                            if (overdueItems && overdueItems.length > 0) {
                              for (const mi of overdueItems) {
                                await supabase
                                  .from("mail_items")
                                  .update({ pickup_date: nextThurs.toISOString() } as any)
                                  .eq("id", mi.id);
                              }
                            }
                          }
                          queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
                        }}
                        aria-label={`Ubetalt faktura for ${tenant.company_name}`}
                      />
                      {!!(tenant as any).has_unpaid_invoice && (
                        <AlertTriangle className="inline h-3.5 w-3.5 ml-1.5 text-destructive" />
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
              {filteredTenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {tenants.length === 0 ? "Ingen lejere fundet" : "Ingen lejere matcher søgningen"}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_first_name">Fornavn</Label>
                <Input
                  id="contact_first_name"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  placeholder="Fornavn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_last_name">Efternavn</Label>
                <Input
                  id="contact_last_name"
                  value={contactLastName}
                  onChange={(e) => setContactLastName(e.target.value)}
                  placeholder="Efternavn"
                />
              </div>
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
            {contactEmail.trim() && (
              <p className="text-sm text-muted-foreground">
                ✉️ En invitation sendes automatisk til {contactEmail.trim()}
              </p>
            )}
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
