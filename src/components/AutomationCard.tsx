import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Package } from "lucide-react";
import { hasMondayAndThursday } from "@/lib/tiers";
import { toast } from "sonner";

interface AutomationCardProps {
  tenantId: string;
  /** Apply the same settings to all these tenants (defaults to [tenantId]) */
  applyToTenantIds?: string[];
  /** Optional heading (e.g. company name) shown above the boxes */
  title?: string;
  currentMailAction: string | null;
  currentPackageAction?: string | null;
  currentMailPickupHour?: number | null;
  currentPackagePickupHour?: number | null;
  currentMailPickupWeekday?: number | null;
  currentPackagePickupWeekday?: number | null;
  tenantTypeName?: string | null;
  /** Hide the package section; defaults to true */
  showPackages?: boolean;
  invalidateKeys?: (string | undefined)[][];
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const pad = (n: number) => n.toString().padStart(2, "0");
const slot = (h: number) => `${pad(h)}:00-${pad(h + 1)}:00`;

function ActionGroup({
  prefix, value, onChange, options, hour, onHour, weekday, onWeekday, allowMonday, t,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; labelKey: string; helpKey: string }[];
  hour: number | null;
  onHour: (h: number) => void;
  weekday: number | null;
  onWeekday: (weekday: number) => void;
  allowMonday: boolean;
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
            <div className="mt-3 grid gap-3 pl-6 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("automation.pickupDayLabel")}</Label>
                <Select value={weekday != null ? String(weekday) : ""} onValueChange={(v) => onWeekday(Number(v))}>
                  <SelectTrigger><SelectValue placeholder={t("automation.pickupDayPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {allowMonday && <SelectItem value="1">{t("automation.monday")}</SelectItem>}
                    <SelectItem value="4">{t("automation.thursday")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("automation.pickupTimeLabel")}</Label>
                <Select value={hour != null ? String(hour) : ""} onValueChange={(v) => onHour(Number(v))}>
                  <SelectTrigger><SelectValue placeholder={t("automation.pickupTimePlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={String(h)}>{slot(h)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
  currentMailPickupWeekday, currentPackagePickupWeekday, tenantTypeName,
  showPackages = true, invalidateKeys, applyToTenantIds, title,
}: AutomationCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initMail = currentMailAction || "send";
  const initPkg = currentPackageAction || "send";
  const [mail, setMail] = useState(initMail);
  const [pkg, setPkg] = useState(initPkg);
  const [mailHour, setMailHour] = useState<number | null>(currentMailPickupHour ?? null);
  const [pkgHour, setPkgHour] = useState<number | null>(currentPackagePickupHour ?? null);
  const [mailWeekday, setMailWeekday] = useState<number | null>(currentMailPickupWeekday ?? 4);
  const [pkgWeekday, setPkgWeekday] = useState<number | null>(currentPackagePickupWeekday ?? 4);
  const allowMonday = hasMondayAndThursday(tenantTypeName);

  useEffect(() => {
    setMail(initMail); setPkg(initPkg);
    setMailHour(currentMailPickupHour ?? null); setPkgHour(currentPackagePickupHour ?? null);
    setMailWeekday(currentMailPickupWeekday ?? 4); setPkgWeekday(currentPackagePickupWeekday ?? 4);
  }, [initMail, initPkg, currentMailPickupHour, currentPackagePickupHour, currentMailPickupWeekday, currentPackagePickupWeekday]);

  useEffect(() => {
    if (!allowMonday) {
      setMailWeekday(4);
      setPkgWeekday(4);
    }
  }, [allowMonday]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          default_mail_action: mail,
          default_package_action: pkg,
          default_mail_pickup_hour: mail === "afhentning" ? mailHour : null,
          default_package_pickup_hour: pkg === "afhentning" ? pkgHour : null,
          default_mail_pickup_weekday: mail === "afhentning" ? mailWeekday : 4,
          default_package_pickup_weekday: pkg === "afhentning" ? pkgWeekday : 4,
        } as any)
        .in("id", applyToTenantIds?.length ? applyToTenantIds : [tenantId]);
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
    (pkg === "afhentning" && pkgHour !== (currentPackagePickupHour ?? null)) ||
    (mail === "afhentning" && mailWeekday !== (currentMailPickupWeekday ?? 4)) ||
    (pkg === "afhentning" && pkgWeekday !== (currentPackagePickupWeekday ?? 4));
  const valid =
    (mail !== "afhentning" || (mailHour != null && mailWeekday != null)) &&
    (pkg !== "afhentning" || (pkgHour != null && pkgWeekday != null));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">{title ?? t("automation.title")}</h3>
        {!title && <p className="mt-1 text-sm text-muted-foreground">{t("automation.description")}</p>}
      </div>
      <div data-tour="automation-cards" className={`grid gap-5 ${showPackages ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-5 w-5 text-primary" />{t("automation.mailLabel")}</CardTitle>
          </CardHeader>
          <CardContent>
          <ActionGroup
            prefix={`auto-mail-${tenantId}`} value={mail} onChange={setMail} hour={mailHour} onHour={setMailHour}
            weekday={mailWeekday} onWeekday={setMailWeekday} allowMonday={allowMonday} t={t}
            options={[
              { value: "send", labelKey: "automation.shipment", helpKey: "automation.shipmentHelp" },
              { value: "scan", labelKey: "automation.scanning", helpKey: "automation.scanningHelp" },
              { value: "afhentning", labelKey: "automation.pickup", helpKey: "automation.pickupHelp" },
            ]}
          />
          </CardContent>
        </Card>
        {showPackages && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5 text-primary" />{t("automation.packageLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
            <ActionGroup
              prefix={`auto-pkg-${tenantId}`} value={pkg} onChange={setPkg} hour={pkgHour} onHour={setPkgHour}
              weekday={pkgWeekday} onWeekday={setPkgWeekday} allowMonday={allowMonday} t={t}
              options={[
                { value: "send", labelKey: "automation.shipment", helpKey: "automation.packageShipmentHelp" },
                { value: "afhentning", labelKey: "automation.pickup", helpKey: "automation.packagePickupHelp" },
              ]}
            />
            </CardContent>
          </Card>
        )}
      </div>
      <Button className="w-full sm:w-auto" disabled={!dirty || !valid || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? t("common.saving") : t("automation.save")}
      </Button>
    </div>
  );
}
