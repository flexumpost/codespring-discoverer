import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function PartnerToggleCard({ tenantId, isPartner, invalidateKey }: { tenantId: string; isPartner: boolean; invalidateKey: unknown[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const toggle = async (checked: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("tenants").update({ is_partner: checked } as any).eq("id", tenantId);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: invalidateKey });
    toast.success(t("partner.saved"));
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t("partner.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch id="is_partner" checked={isPartner} disabled={saving} onCheckedChange={toggle} />
          <Label htmlFor="is_partner">{t("partner.label")}</Label>
        </div>
        <p className="text-sm text-muted-foreground">{t("partner.description")}</p>
      </CardContent>
    </Card>
  );
}
