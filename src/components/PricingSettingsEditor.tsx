import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";

const TIERS = ["Lite", "Standard", "Plus"] as const;

const MAIL_FIELDS = [
  { key: "forklaring", label: "forklaring", textarea: true },
  { key: "forsendelsesdag", label: "forsendelsesdag" },
  { key: "ekstraForsendelse", label: "ekstraForsendelse" },
  { key: "ekstraScanning", label: "ekstraScanning" },
  { key: "ekstraAfhentning", label: "ekstraAfhentning" },
];

const PACKAGE_FIELDS = [
  { key: "haandteringsgebyr", label: "haandteringsgebyr" },
  { key: "afhentning", label: "afhentning" },
  { key: "forsendelse", label: "forsendelse" },
];

const FIELD_LABELS: Record<string, string> = {
  forklaring: "Forklaring",
  forsendelsesdag: "Forsendelsesdag",
  ekstraForsendelse: "Ekstra forsendelse",
  ekstraScanning: "Ekstra scanning",
  ekstraAfhentning: "Ekstra afhentning",
  haandteringsgebyr: "Håndteringsgebyr",
  afhentning: "Afhentning",
  forsendelse: "Forsendelse",
};

type PricingRow = { id: string; tier: string; category: string; field_key: string; field_value: string };

export function PricingSettingsEditor() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_settings").select("*");
      if (error) throw error;
      return data as PricingRow[];
    },
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("pricingSettings.loadingPrices")}</p>;

  return (
    <div className="space-y-6">
      {TIERS.map((tier) => (
        <TierSection key={tier} tier={tier} rows={(data ?? []).filter((r) => r.tier === tier)} />
      ))}
    </div>
  );
}

function TierSection({ tier, rows }: { tier: string; rows: PricingRow[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[`${r.category}.${r.field_key}`] = r.field_value));
    setValues(map);
  }, [rows]);

  const hasChanges = rows.some((r) => values[`${r.category}.${r.field_key}`] !== r.field_value);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = rows
        .filter((r) => values[`${r.category}.${r.field_key}`] !== r.field_value)
        .map((r) => supabase.from("pricing_settings").update({ field_value: values[`${r.category}.${r.field_key}`], updated_at: new Date().toISOString() } as any).eq("id", r.id));
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pricing-settings"] }); toast.success(t("pricingSettings.pricesSaved", { tier })); },
    onError: () => toast.error(t("pricingSettings.couldNotSave")),
  });

  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{tier}</CardTitle>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
          <Save className="mr-1 h-4 w-4" /> {saveMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t("pricingSettings.mailSection")}</h4>
            {MAIL_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{FIELD_LABELS[f.key]}</Label>
                {f.textarea ? (
                  <Textarea value={values[`mail.${f.key}`] ?? ""} onChange={(e) => set(`mail.${f.key}`, e.target.value)} rows={3} />
                ) : (
                  <Input value={values[`mail.${f.key}`] ?? ""} onChange={(e) => set(`mail.${f.key}`, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t("pricingSettings.packageSection")}</h4>
            {PACKAGE_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{FIELD_LABELS[f.key]}</Label>
                <Input value={values[`package.${f.key}`] ?? ""} onChange={(e) => set(`package.${f.key}`, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
