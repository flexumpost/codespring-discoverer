import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();
  const queryClient = useQueryClient();

  // Dialog state for "Opret ny postmodtager"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ user_id: string; name: string; email: string } | null>(null);
  const [editTenantIds, setEditTenantIds] = useState<string[]>([]);
  const [editExistingTenantIds, setEditExistingTenantIds] = useState<string[]>([]);

  const openDialog = () => {
    setSelectedTenantIds(selectedTenantId ? [selectedTenantId] : []);
    setDialogOpen(true);
  };

  const openEditDialog = async (userId: string, name: string, email: string) => {
    setEditingUser({ user_id: userId, name, email });
    // Fetch all tenant_users for this user across owner's tenants
    const ownerTenantIds = tenants.map((t) => t.id);
    const { data } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .in("tenant_id", ownerTenantIds);
    const currentIds = (data ?? []).map((r) => r.tenant_id);
    setEditTenantIds(currentIds);
    setEditExistingTenantIds(currentIds);
    setEditDialogOpen(true);
  };

  const toggleEditTenant = (tenantId: string) => {
    setEditTenantIds((prev) =>
      prev.includes(tenantId) ? prev.filter((id) => id !== tenantId) : [...prev, tenantId]
    );
  };

  const saveEditMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const toAdd = editTenantIds.filter((id) => !editExistingTenantIds.includes(id));
      const toRemove = editExistingTenantIds.filter((id) => !editTenantIds.includes(id));

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("tenant_users")
          .insert(toAdd.map((tid) => ({ tenant_id: tid, user_id: editingUser.user_id })));
        if (error) throw error;
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("tenant_users")
          .delete()
          .eq("user_id", editingUser.user_id)
          .in("tenant_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("settings.companyAssignmentUpdated"));
      setEditDialogOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t("settings.couldNotUpdateAssignment"));
    },
  });

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
          first_name: newName.split(" ")[0]?.trim() || "",
          last_name: newName.split(" ").slice(1).join(" ")?.trim() || "",
          mode: "invite",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(t("settings.invitationSent"));
      setDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setSelectedTenantIds([]);
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t("settings.couldNotCreateRecipient"));
    },
  });

  const canSubmitRecipient =
    newEmail.trim().length > 0 &&
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
        .select("id, first_name, last_name, email")
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
      toast.success(t("settings.recipientDeleted"));
      queryClient.invalidateQueries({ queryKey: ["tenant-users", selectedTenantId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || t("settings.couldNotDeleteRecipient"));
    },
  });

  const typeName = (selectedTenant?.tenant_types as any)?.name as string | undefined;

  // Operator view
  if (role === "operator") {
    return (
      <AppLayout>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
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
        <h2 className="text-2xl font-bold mt-4">{t("settings.title")}</h2>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">{t("settings.noTenantProfile")}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company + Contact (read-only) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("settings.company")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">{t("settings.companyName")}</Label>
                  <p className="font-medium">{selectedTenant.company_name}</p>
                </div>
                {selectedTenant.address && (
                  <div>
                    <Label className="text-muted-foreground text-xs">{t("settings.address")}</Label>
                    <p className="font-medium">{selectedTenant.address}</p>
                  </div>
                )}
                {typeName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">{t("settings.tenantType")}</Label>
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
                <CardTitle className="text-base">{t("settings.contactInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">{t("settings.contactPerson")}</Label>
                  <p className="font-medium">{[selectedTenant.contact_first_name, selectedTenant.contact_last_name].filter(Boolean).join(" ") || "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">{t("settings.contactEmail")}</Label>
                  <p className="font-medium">{selectedTenant.contact_email || "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Postmodtagere */}
            {tuError && (
              <p className="text-sm text-destructive">{t("settings.couldNotFetchRecipients")}</p>
            )}
            {tenantUsers && tenantUsers.length > 0 && (
              <div className="space-y-3">
                {tenantUsers.filter((tu) => tu.user_id !== selectedTenant?.user_id).map((tu) => {
                  const profile = tu.profile;
                  return (
                    <Card key={tu.id}>
                      <CardContent className="flex items-center justify-between py-4 px-4">
                        <div>
                          <p className="font-medium text-sm">{[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—"}</p>
                          <p className="text-xs text-muted-foreground">{profile?.email || "—"}</p>
                        </div>
                        {isOwner && (
                          <div className="flex items-center gap-1">
                            {tenants.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openEditDialog(
                                    tu.user_id,
                                    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—",
                                    profile?.email || "—"
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteTenantUserMutation.mutate(tu.id)}
                              disabled={deleteTenantUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
              {t("settings.createMailRecipient")}
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
            <DialogTitle>{t("settings.createMailRecipient")}</DialogTitle>
            <DialogDescription>{t("settings.recipientInviteDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rec_name">{t("settings.name")}</Label>
              <Input
                id="rec_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("settings.fullName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec_email">{t("settings.email")}</Label>
              <Input
                id="rec_email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t("tenants.emailPlaceholder")}
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
              {createRecipientMutation.isPending ? "Sender invitation..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rediger virksomhedstilknytning */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger virksomhedstilknytning</DialogTitle>
            <DialogDescription>
              Vælg hvilke virksomheder {editingUser?.name} skal have adgang til.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Virksomheder</Label>
            <div className="space-y-2 rounded-md border p-3">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-tenant-${t.id}`}
                    checked={editTenantIds.includes(t.id)}
                    onCheckedChange={() => toggleEditTenant(t.id)}
                  />
                  <Label htmlFor={`edit-tenant-${t.id}`} className="text-sm font-normal cursor-pointer">
                    {t.company_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveEditMutation.mutate()}
              disabled={editTenantIds.length === 0 || saveEditMutation.isPending}
            >
              {saveEditMutation.isPending ? "Gemmer..." : "Gem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SettingsPage;
