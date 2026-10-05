import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PrimaryContact = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export function TenantContactPersons({
  tenantId,
  ownerId,
  primaryContact,
}: {
  tenantId: string;
  ownerId: string | null;
  primaryContact: PrimaryContact;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { data: recipients = [], error } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      const { data: relations, error: relationError } = await supabase
        .from("tenant_users")
        .select("id, user_id")
        .eq("tenant_id", tenantId);
      if (relationError) throw relationError;
      if (!relations?.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", relations.map((relation) => relation.user_id));
      if (profileError) throw profileError;
      return relations.map((relation) => ({
        ...relation,
        profile: profiles?.find((profile) => profile.id === relation.user_id) ?? null,
      }));
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const { data, error: inviteError } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          tenant_ids: [tenantId],
          email: email.trim(),
          first_name: parts[0] ?? "",
          last_name: parts.slice(1).join(" "),
          mode: "invite",
        },
      });
      if (inviteError) throw inviteError;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success(t("settings.invitationSent"));
      setName("");
      setEmail("");
      setOpen(false);
    },
    onError: (inviteError: Error) => toast.error(inviteError.message || t("settings.couldNotCreateRecipient")),
  });

  const remove = useMutation({
    mutationFn: async (tenantUserId: string) => {
      const { data, error: deleteError } = await supabase.functions.invoke("delete-tenant-user", {
        body: { tenant_user_id: tenantUserId },
      });
      if (deleteError) throw deleteError;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success(t("settings.recipientDeleted"));
    },
    onError: (deleteError: Error) => toast.error(deleteError.message || t("settings.couldNotDeleteRecipient")),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{t("settings.mailRecipients")}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("settings.createMailRecipient")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{t("settings.couldNotFetchRecipients")}</p>}
          {ownerId && !recipients.some((recipient) => recipient.user_id === ownerId) && (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {[primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{primaryContact.email || "—"}</p>
              </div>
            </div>
          )}
          {recipients.map((recipient) => {
            const profile = recipient.profile;
            const isOwner = recipient.user_id === ownerId;
            return (
              <div key={recipient.id} className="flex items-center gap-3 rounded-md border p-3">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{profile?.email || "—"}</p>
                </div>
                {!isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(recipient.id)}
                    disabled={remove.isPending}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.createMailRecipient")}</DialogTitle>
            <DialogDescription>{t("settings.recipientInviteDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="view_recipient_name">{t("settings.name")}</Label>
              <Input id="view_recipient_name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.fullName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view_recipient_email">{t("settings.email")}</Label>
              <Input id="view_recipient_email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("tenants.emailPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => invite.mutate()} disabled={!email.trim() || invite.isPending}>
              {invite.isPending ? t("settings.sendingInvitation") : t("settings.sendInvitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}