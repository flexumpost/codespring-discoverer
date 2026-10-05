import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AutomationCardProps {
  tenantId: string;
  currentMailAction: string | null;
  currentPackageAction?: string | null;
  currentMailPickupHour?: number | null;
  currentPackagePickupHour?: number | null;
  /** Hide the package section; defaults to true */
  showPackages?: boolean;
  invalidateKeys?: (string | undefined)[][];
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const pad = (n: number) => n.toString().padStart(2, "0");
const slot = (h: number) => `${pad(h)}:00-${pad(h + 1)}:00`;

function ActionGroup({
  prefix, value, onChange, options, hour, onHour, t,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; labelKey: string; helpKey: string }[];
  hour: number | null;
  onHour: (h: number) => void;
  t: (k: string) => string;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
      {options.map((opt) => (
        <div key={opt.value} className="rounded-md border p-3">
          <div className="flex items-start gap-2">
            <RadioGroupItem id={`${prefix}-${opt.value}`} value={opt.value} className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor={`${prefix}-${opt.value}`} className="font-medium text-sm cursor-pointer">
                {t(opt.labelKey)}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t(opt.helpKey)}</p>
            </div>
          </div>
          {opt.value === "afhentning" && value === "afhentning" && (
            <div className="mt-3 pl-6 space-y-1">
              <Label className="text-xs">{t("automation.pickupTimeLabel")}</Label>
              <Select value={hour != null ? String(hour) : ""} onValueChange={(v) => onHour(Number(v))}>
                <SelectTrigger className="w-48"><SelectValue placeholder={t("automation.pickupTimePlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => <SelectItem key={h} value={String(h)}>{slot(h)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("automation.pickupTimeNote")}</p>
            </div>
          )}
        </div>
      ))}
    </RadioGroup>
  );
}

export function AutomationCard({
  tenantId, currentMailAction, currentPackageAction, currentMailPickupHour, currentPackagePickupHour,
  showPackages = true, invalidateKeys,
}: AutomationCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initMail = currentMailAction || "send";
  const initPkg = currentPackageAction || "send";
  const [mail, setMail] = useState(initMail);
  const [pkg, setPkg] = useState(initPkg);
  const [mailHour, setMailHour] = useState<number | null>(currentMailPickupHour ?? null);
  const [pkgHour, setPkgHour] = useState<number | null>(currentPackagePickupHour ?? null);

  useEffect(() => {
    setMail(initMail); setPkg(initPkg);
    setMailHour(currentMailPickupHour ?? null); setPkgHour(currentPackagePickupHour ?? null);
  }, [initMail, initPkg, currentMailPickupHour, currentPackagePickupHour]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          default_mail_action: mail,
          default_package_action: pkg,
          default_mail_pickup_hour: mail === "afhentning" ? mailHour : null,
          default_package_pickup_hour: pkg === "afhentning" ? pkgHour : null,
        } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("automation.saved"));
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      (invalidateKeys ?? []).forEach((k) => queryClient.invalidateQueries({ queryKey: k as any }));
    },
    onError: () => toast.error(t("automation.couldNotSave")),
  });

  const dirty =
    mail !== initMail || pkg !== initPkg ||
    (mail === "afhentning" && mailHour !== (currentMailPickupHour ?? null)) ||
    (pkg === "afhentning" && pkgHour !== (currentPackagePickupHour ?? null));
  const valid = (mail !== "afhentning" || mailHour != null) && (pkg !== "afhentning" || pkgHour != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("automation.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">{t("automation.description")}</p>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("automation.mailLabel")}</Label>
          <ActionGroup
            prefix="auto-mail" value={mail} onChange={setMail} hour={mailHour} onHour={setMailHour} t={t}
            options={[
              { value: "send", labelKey: "automation.shipment", helpKey: "automation.shipmentHelp" },
              { value: "scan", labelKey: "automation.scanning", helpKey: "automation.scanningHelp" },
              { value: "afhentning", labelKey: "automation.pickup", helpKey: "automation.pickupHelp" },
            ]}
          />
        </div>
        {showPackages && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t("automation.packageLabel")}</Label>
            <ActionGroup
              prefix="auto-pkg" value={pkg} onChange={setPkg} hour={pkgHour} onHour={setPkgHour} t={t}
              options={[
                { value: "send", labelKey: "automation.shipment", helpKey: "automation.packageShipmentHelp" },
                { value: "afhentning", labelKey: "automation.pickup", helpKey: "automation.packagePickupHelp" },
              ]}
            />
          </div>
        )}
        <Button className="w-full" disabled={!dirty || !valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t("common.saving") : t("automation.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
