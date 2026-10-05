import { notifyAddressChange } from "@/lib/notifyAddressChange";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useTenants } from "@/hooks/useTenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  ["shipping_recipient", "shipping.recipientName"],
  ["shipping_co", "shipping.coName"],
  ["shipping_address", "shipping.address"],
  ["shipping_address_2", "shipping.address2"],
  ["shipping_zip", "shipping.zipCode"],
  ["shipping_city", "shipping.city"],
  ["shipping_state", "shipping.state"],
  ["shipping_country", "shipping.country"],
] as const;
const REQUIRED = ["shipping_recipient", "shipping_address", "shipping_zip", "shipping_city", "shipping_country"];

export function AddressCard({ tenant, applyToIds, title }: { tenant: any; applyToIds?: string[]; title?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map(([k]) => [k, tenant[k] ?? ""]))
  );
  const [saving, setSaving] = useState(false);
  const complete = REQUIRED.every((k) => String(tenant[k] ?? "").trim());
  const valid = REQUIRED.every((k) => values[k].trim());

  const save = async () => {
    setSaving(true);
    const payload: Record<string, any> = { shipping_confirmed: true };
    for (const [k] of FIELDS) payload[k] = values[k].trim() || (REQUIRED.includes(k) ? values[k] : null);
    const ids = applyToIds?.length ? applyToIds : [tenant.id];
    const { error } = await supabase.from("tenants").update(payload as any).in("id", ids);
    setSaving(false);
    if (error) return toast.error(error.message);
    ids.forEach((id) => notifyAddressChange(id));
    qc.invalidateQueries({ queryKey: ["my-tenants"] });
    qc.invalidateQueries({ queryKey: ["partner-group"] });
    toast.success(t("partnerAddresses.saved", { name: tenant.company_name }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title ?? tenant.company_name}</CardTitle>
        {!complete ? (
          <Badge variant="destructive">{t("partnerAddresses.missing")}</Badge>
        ) : !tenant.shipping_confirmed ? (
          <Badge variant="secondary">{t("partnerAddresses.unconfirmed")}</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`${tenant.id}-${k}`}>{t(label)}</Label>
              <Input id={`${tenant.id}-${k}`} value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={!valid || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("partnerAddresses.save")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PartnerAddressesPage() {
  const { t } = useTranslation();
  const { tenants, selectedTenant, isLoading } = useTenants();
  const isPartner = tenants.some((x: any) => x.is_partner);
  const base: any = selectedTenant ?? tenants[0];
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("partnerAddresses.title")}</h1>
          <p className="text-muted-foreground">{t("partnerAddresses.description")}</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : !isPartner && base ? (
          <div className="max-w-2xl">
            <AddressCard
              tenant={base}
              applyToIds={tenants.map((x: any) => x.id)}
              title={tenants.length > 1 ? tenants.map((x: any) => x.company_name).join(", ") : undefined}
            />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {tenants.map((x: any) => <AddressCard key={x.id} tenant={x} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
