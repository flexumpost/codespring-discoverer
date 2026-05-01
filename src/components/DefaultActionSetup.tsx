import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface DefaultActionSetupProps {
  tenantId: string;
  tenantTypeName: string;
}

export function DefaultActionSetup({ tenantId, tenantTypeName }: DefaultActionSetupProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mailAction, setMailAction] = useState("");
  const packageAction = "send";

  const MAIL_ACTIONS = [
    { value: "send", label: t("defaultAction.shipment", "Forsendelse") },
    { value: "scan", label: t("defaultAction.scanning", "Scanning") },
  ];

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").update({ default_mail_action: mailAction, default_package_action: packageAction } as any).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-tenants"] }); toast.success(t("defaultAction.saved", "Standardhandling gemt!")); },
    onError: () => { toast.error(t("defaultAction.couldNotSave", "Kunne ikke gemme standardhandling")); },
  });

  const isValid = mailAction !== "";

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("defaultAction.title", "Vælg standardhandling")}</DialogTitle>
          <DialogDescription>{t("defaultAction.description", "Inden du kan fortsætte, skal du vælge hvad der som standard skal ske med dine breve og pakker. Du kan altid ændre dette senere under Indstillinger.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("defaultAction.defaultMailAction", "Standard handling for breve")}</Label>
            <Select value={mailAction} onValueChange={setMailAction}>
              <SelectTrigger><SelectValue placeholder={t("defaultAction.selectAction", "Vælg handling...")} /></SelectTrigger>
              <SelectContent>{MAIL_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
            {mailAction === "scan" && tenantTypeName !== "Plus" && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "defaultAction.scanHelpLiteStandard",
                  "Breve scannes på næste planlagte gratis scandag. Vælg manuelt 'Scan nu' på det enkelte brev hvis du ønsker det scannet med det samme (mod gebyr).",
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("defaultAction.defaultPackageAction", "Standard handling for pakker")}</Label>
            <p className="text-sm text-muted-foreground">{t("defaultAction.shipment", "Forsendelse")}</p>
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? t("common.saving") : t("defaultAction.saveAndContinue", "Gem og fortsæt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
