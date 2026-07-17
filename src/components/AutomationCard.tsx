import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AutomationCardProps {
  tenantId: string;
  currentMailAction: string | null;
  /** Hide the package row for Plus etc.; defaults to true */
  showPackages?: boolean;
  /** Extra react-query keys to invalidate after saving */
  invalidateKeys?: (string | undefined)[][];
}

const OPTIONS: { value: string; labelKey: string; helpKey: string }[] = [
  { value: "send", labelKey: "automation.shipment", helpKey: "automation.shipmentHelp" },
  { value: "scan", labelKey: "automation.scanning", helpKey: "automation.scanningHelp" },
  { value: "afhentning", labelKey: "automation.pickup", helpKey: "automation.pickupHelp" },
];

export function AutomationCard({ tenantId, currentMailAction, showPackages = true, invalidateKeys }: AutomationCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string>(currentMailAction ?? "send");

  useEffect(() => {
    setValue(currentMailAction ?? "send");
  }, [currentMailAction]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ default_mail_action: value } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("automation.saved"));
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      (invalidateKeys ?? []).forEach((k) => queryClient.invalidateQueries({ queryKey: k as any }));
    },
    onError: () => {
      toast.error(t("automation.couldNotSave"));
    },
  });

  const dirty = value !== (currentMailAction ?? "send");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("automation.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("automation.description")}</p>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("automation.mailLabel")}</Label>
          <RadioGroup value={value} onValueChange={setValue} className="space-y-2">
            {OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-2 rounded-md border p-3">
                <RadioGroupItem id={`auto-${opt.value}`} value={opt.value} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={`auto-${opt.value}`} className="font-medium text-sm cursor-pointer">
                    {t(opt.labelKey)}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(opt.helpKey)}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
        {showPackages && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t("automation.packageLabel")}</Label>
            <p className="text-sm text-muted-foreground italic">{t("automation.packageLocked")}</p>
          </div>
        )}
        <Button
          className="w-full"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? t("common.saving") : t("automation.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
