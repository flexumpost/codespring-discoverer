import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import { useAuth } from "@/hooks/useAuth";
import { TenantSelector } from "@/components/TenantSelector";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MailPricingCard, PackagePricingCard } from "@/components/PricingOverview";
import { OperatorSettingsTabs } from "@/components/OperatorSettingsTabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const SettingsPage = () => {
  const { role, user } = useAuth();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();
  const queryClient = useQueryClient();

  // Dialog state for "Opret ny postmodtager"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  const openDialog = () => {
    setSelectedTenantIds(selectedTenantId ? [selectedTenantId] : []);
    setDialogOpen(true);
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const createRecipientMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          tenant_ids: selectedTenantIds,
          email: newEmail.trim(),
          password: newPassword,
          full_name: newName.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Postmodtager oprettet");
      setDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setSelectedTenantIds([]);
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Kunne ikke oprette postmodtager");
    },
  });

  const canSubmitRecipient =
    newEmail.trim().length > 0 &&
    newPassword.length >= 6 &&
    selectedTenantIds.length > 0;

  // Fetch linked tenant users (postmodtagere) — two-step to avoid PGRST200
  const { data: tenantUsers, error: tuError } = useQuery({
    queryKey: ["tenant-users", selectedTenantId],
    enabled: !!selectedTenantId && role !== "operator",
    queryFn: async () => {
      const { data: relations, error: e1 } = await supabase
        .from("tenant_users")
        .select("id, user_id")
        .eq("tenant_id", selectedTenantId!);
      if (e1) throw e1;
      if (!relations || relations.length === 0) return [];

      const userIds = relations.map((r) => r.user_id);
      const { data: profiles, error: e2 } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (e2) throw e2;

      return relations.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id) ?? null,
      }));
    },
  });

  const isOwner = user?.id === selectedTenant?.user_id;

  const deleteTenantUserMutation = useMutation({
    mutationFn: async (tenantUserId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-tenant-user", {
        body: { tenant_user_id: tenantUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Postmodtager slettet");
      queryClient.invalidateQueries({ queryKey: ["tenant-users", selectedTenantId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Kunne ikke slette postmodtager");
    },
  });

  const typeName = (selectedTenant?.tenant_types as any)?.name as string | undefined;

  // Operator view
  if (role === "operator") {
    return (
      <AppLayout>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Indstillinger</h2>
        </div>
        <OperatorSettingsTabs />
      </AppLayout>
    );
  }

  // Tenant view
  return (
    <AppLayout>
      <div className="mb-6">
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
        <h2 className="text-2xl font-bold mt-4">Indstillinger</h2>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">
          Ingen lejer-profil fundet for din konto.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company + Contact (read-only) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Virksomhed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Firmanavn</Label>
                  <p className="font-medium">{selectedTenant.company_name}</p>
                </div>
                {selectedTenant.address && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Adresse</Label>
                    <p className="font-medium">{selectedTenant.address}</p>
                  </div>
                )}
                {typeName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Lejertype</Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={TYPE_COLORS[typeName] ?? ""}
                      >
                        {typeName}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kontaktoplysninger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Kontaktperson</Label>
                  <p className="font-medium">{selectedTenant.contact_name || "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Kontakt-email</Label>
                  <p className="font-medium">{selectedTenant.contact_email || "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Postmodtagere */}
            {tuError && (
              <p className="text-sm text-destructive">Kunne ikke hente postmodtagere.</p>
            )}
            {tenantUsers && tenantUsers.length > 0 && (
              <div className="space-y-3">
                {tenantUsers.map((tu) => {
                  const profile = tu.profile;
                  return (
                    <Card key={tu.id}>
                      <CardContent className="flex items-center justify-between py-4 px-4">
                        <div>
                          <p className="font-medium text-sm">{profile?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{profile?.email || "—"}</p>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteTenantUserMutation.mutate(tu.id)}
                            disabled={deleteTenantUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={openDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Opret ny postmodtager
            </Button>
          </div>

          {/* Column 2: Mail pricing */}
          <MailPricingCard tenantTypeName={typeName} tenant={selectedTenant as any} />

          {/* Column 3: Package pricing */}
          <PackagePricingCard tenantTypeName={typeName} tenant={selectedTenant as any} />
        </div>
      )}

      {/* Dialog: Opret ny postmodtager */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opret ny postmodtager</DialogTitle>
            <DialogDescription>
              Opret en ny bruger med adgang til dine virksomheder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rec_name">Navn</Label>
              <Input
                id="rec_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Fulde navn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec_email">Email</Label>
              <Input
                id="rec_email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@eksempel.dk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec_password">Adgangskode</Label>
              <Input
                id="rec_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 tegn"
              />
            </div>
            {/* Multi-tenant selection */}
            {tenants.length > 1 && (
              <div className="space-y-2">
                <Label>Tilknyt til virksomheder</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {tenants.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`tenant-${t.id}`}
                        checked={selectedTenantIds.includes(t.id)}
                        onCheckedChange={() => toggleTenantSelection(t.id)}
                      />
                      <Label htmlFor={`tenant-${t.id}`} className="text-sm font-normal cursor-pointer">
                        {t.company_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => createRecipientMutation.mutate()}
              disabled={!canSubmitRecipient || createRecipientMutation.isPending}
            >
              {createRecipientMutation.isPending ? "Opretter..." : "Opret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SettingsPage;
