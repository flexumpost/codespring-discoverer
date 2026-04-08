import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { ReactNode } from "react";

function renderForklaring(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("##")) {
      return <span key={i} className="block font-semibold text-foreground text-base">{line.slice(2).trim()}{i < lines.length - 1 && <br />}</span>;
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
      return part;
    });
    return <span key={i}>{parts}{i < lines.length - 1 && <br />}</span>;
  });
}

const MAIL_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { forklaring: "## Standard handling\n- **Scanning:** Gratis hver den 1. torsdag i måneden.\n- **Afhentning:** Gratis afhentning hver den 1. torsdag i måneden.\n- **Forsendelse:** Gratis forsendelse hver den 1. torsdag i måneden (forsendelsen tillægges porto)\n\n## Ekstra handling\n**Priser jvf. nedenstående.**\n- **Scanning:** Kan scannes tirsdag eller torsdag.\n- **Afhentning:** Kan afhentes tirsdag eller torsdag. (Skal bookes)\n- **Forsendelse:** Kan sendes ekstra hver torsdag.", forsendelsesdag: "Hver den 1. torsdag i måneden", ekstraForsendelse: "50 kr. — kan sendes ekstra hver torsdag", ekstraScanning: "50 kr. — kan scannes tirsdag eller torsdag", ekstraAfhentning: "50 kr. — kan afhentes tirsdag eller torsdag (Skal bookes)" },
  Standard: { forklaring: "## Standard handling\n- **Scanning:** Gratis hver torsdag.\n- **Afhentning:** Gratis afhentning hver torsdag.\n- **Forsendelse:** Gratis forsendelse hver torsdag (forsendelsen tillægges porto)\n\n## Ekstra handling\n**Priser jvf. nedenstående.**\n- **Scanning:** Kan scannes alle hverdage.\n- **Afhentning:** Kan afhentes tirsdag eller torsdag. (Skal bookes)", forsendelsesdag: "Hver torsdag", ekstraForsendelse: "Inkluderet i standard", ekstraScanning: "30 kr. — kan scannes alle hverdage", ekstraAfhentning: "30 kr. — kan afhentes tirsdag eller torsdag (Skal bookes)" },
  Plus: { forklaring: "## Standard handling\n- **Scanning:** Gratis alle hverdage.\n- **Afhentning:** Gratis alle hverdage. (Skal bookes)\n- **Forsendelse:** Gratis forsendelse hver torsdag (Vi betaler porto)\n\n## Ekstra handling\n**Priser jvf. nedenstående.**\nEkstra handlinger er ikke muligt.", forsendelsesdag: "Hver torsdag", ekstraForsendelse: "Inkluderet — vi betaler porto", ekstraScanning: "Inkluderet — alle hverdage", ekstraAfhentning: "Inkluderet — alle hverdage (Skal bookes)" },
};

const PACKAGE_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { haandteringsgebyr: "50 kr.", afhentning: "Afhentning kan ske tirsdag og torsdag efter aftale (Skal bookes)", forsendelse: "Sendes senest 1. torsdag i måneden, men vi sender pakker, så snart det er muligt, porto tillægges" },
  Standard: { haandteringsgebyr: "30 kr.", afhentning: "Afhentning kan ske tirsdag og torsdag efter aftale (Skal bookes)", forsendelse: "Sendes senest efterfølgende torsdag, men vi sender pakker, så snart det er muligt, porto tillægges" },
  Plus: { haandteringsgebyr: "10 kr.", afhentning: "Afhentning kan ske alle hverdage, efter aftale (Skal bookes)", forsendelse: "Sendes senest efterfølgende torsdag, men vi sender pakker, så snart det er muligt, porto tillægges" },
};

function usePricingData() {
  return useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_settings").select("tier, category, field_key, field_value");
      if (error) throw error;
      const mail: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(MAIL_PRICING_DEFAULTS));
      const pkg: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(PACKAGE_PRICING_DEFAULTS));
      (data ?? []).forEach((row: any) => {
        if (row.category === "mail" && mail[row.tier]) mail[row.tier][row.field_key] = row.field_value;
        else if (row.category === "package" && pkg[row.tier]) pkg[row.tier][row.field_key] = row.field_value;
      });
      return { mail, pkg };
    },
  });
}

interface TenantProp { id: string; default_mail_action?: string | null; default_package_action?: string | null }
interface PricingCardProps { tenantTypeName: string | undefined; tenant?: TenantProp }

export function MailPricingCard({ tenantTypeName, tenant }: PricingCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mailAction, setMailAction] = useState(tenant?.default_mail_action ?? "");
  const { data: pricing } = usePricingData();

  useEffect(() => { setMailAction(tenant?.default_mail_action ?? ""); }, [tenant?.id, tenant?.default_mail_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const mail = pricing?.mail?.[tenantTypeName] ?? MAIL_PRICING_DEFAULTS[tenantTypeName];
  const mailChanged = tenant && mailAction !== (tenant.default_mail_action ?? "");

  const MAIL_ACTIONS = [
    { value: "send", label: t("actions.shipment") },
    { value: "scan", label: t("actions.scanning") },
  ];

  const mailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").update({ default_mail_action: mailAction } as any).eq("id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-tenants"] }); toast.success(t("pricing.mailActionSaved")); },
    onError: () => toast.error(t("pricing.couldNotSave")),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t("pricing.mailTitle", { tier: tenantTypeName })}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {tenant && (
          <div className="space-y-3 border-b pb-4 mb-2">
            <Label>{t("pricing.defaultMailAction")}</Label>
            <div className="flex items-center gap-2">
              <Select value={mailAction} onValueChange={setMailAction}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("pricing.selectAction")} /></SelectTrigger>
                <SelectContent>{MAIL_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={() => mailMutation.mutate()} disabled={!mailChanged || !mailAction || mailMutation.isPending}>
                <Save className="mr-1 h-4 w-4" /> {mailMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        )}
        {mail.forklaring && <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{renderForklaring(mail.forklaring)}</div>}
        <Table>
          <TableHeader><TableRow><TableHead className="w-[200px]">{t("pricing.subject")}</TableHead><TableHead>{t("pricing.conditionPrice")}</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">{t("pricing.shippingDay")}</TableCell><TableCell>{mail.forsendelsesdag}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">{t("pricing.extraShipment")}</TableCell><TableCell>{mail.ekstraForsendelse}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">{t("pricing.extraScanning")}</TableCell><TableCell>{mail.ekstraScanning}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">{t("pricing.extraPickup")}</TableCell><TableCell>{mail.ekstraAfhentning}</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PackagePricingCard({ tenantTypeName, tenant }: PricingCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const packageAction = "send";
  const { data: pricing } = usePricingData();

  useEffect(() => {
    // Auto-fix if tenant currently has "afhentning" as default package action
    if (tenant?.default_package_action === "afhentning") {
      supabase.from("tenants").update({ default_package_action: "send" } as any).eq("id", tenant.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      });
    }
  }, [tenant?.id, tenant?.default_package_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const pkg = pricing?.pkg?.[tenantTypeName] ?? PACKAGE_PRICING_DEFAULTS[tenantTypeName];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t("pricing.packageTitle", { tier: tenantTypeName })}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {tenant && (
          <div className="space-y-3 border-b pb-4 mb-2">
            <Label>{t("pricing.defaultPackageAction")}</Label>
            <p className="text-sm text-muted-foreground">{t("actions.shipment")}</p>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead className="w-[200px]">{t("pricing.subject")}</TableHead><TableHead>{t("pricing.conditionPrice")}</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">{t("pricing.handlingFee")}</TableCell><TableCell>{pkg.haandteringsgebyr}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">{t("pricing.pickupLabel")}</TableCell><TableCell>{pkg.afhentning}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">{t("pricing.shipmentLabel")}</TableCell><TableCell>{pkg.forsendelse}</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
