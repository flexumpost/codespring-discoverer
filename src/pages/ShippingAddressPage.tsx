import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import { TenantSelector } from "@/components/TenantSelector";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save } from "lucide-react";

const ShippingAddressPage = () => {
  const { t } = useTranslation();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();
  const queryClient = useQueryClient();

  const [shippingRecipient, setShippingRecipient] = useState("");
  const [shippingCo, setShippingCo] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [useSameAddress, setUseSameAddress] = useState(false);

  // Find reference tenant (first other tenant with a complete address)
  const referenceTenant = tenants.find(
    (t) =>
      t.id !== selectedTenantId &&
      (t as any).shipping_recipient?.trim() &&
      (t as any).shipping_address?.trim() &&
      (t as any).shipping_zip?.trim() &&
      (t as any).shipping_city?.trim() &&
      (t as any).shipping_country?.trim()
  );

  const showCheckbox = tenants.length > 1 && !!referenceTenant;

  useEffect(() => {
    setUseSameAddress(false);
    if (selectedTenant) {
      setShippingRecipient((selectedTenant as any).shipping_recipient ?? "");
      setShippingCo((selectedTenant as any).shipping_co ?? "");
      setShippingAddress((selectedTenant as any).shipping_address ?? "");
      setShippingZip((selectedTenant as any).shipping_zip ?? "");
      setShippingCity((selectedTenant as any).shipping_city ?? "");
      setShippingState((selectedTenant as any).shipping_state ?? "");
      setShippingCountry((selectedTenant as any).shipping_country ?? "");
    }
  }, [selectedTenant]);

  const handleSyncToggle = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked && referenceTenant) {
      const ref = referenceTenant as any;
      setShippingRecipient(ref.shipping_recipient ?? "");
      setShippingCo(ref.shipping_co ?? "");
      setShippingAddress(ref.shipping_address ?? "");
      setShippingZip(ref.shipping_zip ?? "");
      setShippingCity(ref.shipping_city ?? "");
      setShippingState(ref.shipping_state ?? "");
      setShippingCountry(ref.shipping_country ?? "");
    }
  };

  const shippingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          shipping_recipient: shippingRecipient,
          shipping_co: shippingCo || null,
          shipping_address: shippingAddress,
          shipping_zip: shippingZip,
          shipping_city: shippingCity,
          shipping_state: shippingState || null,
          shipping_country: shippingCountry,
          shipping_confirmed: true,
        } as any)
        .eq("id", selectedTenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success(t("shipping.addressSaved"));
    },
    onError: (err: any) => {
      console.error("ShippingAddress save error:", err);
      toast.error(err?.message || t("shipping.couldNotSave"));
    },
  });

  const hasShippingChanges =
    selectedTenant &&
    (shippingRecipient !== ((selectedTenant as any).shipping_recipient ?? "") ||
      shippingCo !== ((selectedTenant as any).shipping_co ?? "") ||
      shippingAddress !== ((selectedTenant as any).shipping_address ?? "") ||
      shippingZip !== ((selectedTenant as any).shipping_zip ?? "") ||
      shippingCity !== ((selectedTenant as any).shipping_city ?? "") ||
      shippingState !== ((selectedTenant as any).shipping_state ?? "") ||
      shippingCountry !== ((selectedTenant as any).shipping_country ?? ""));

  const shippingValid =
    shippingRecipient.trim() !== "" &&
    shippingAddress.trim() !== "" &&
    shippingZip.trim() !== "" &&
    shippingCity.trim() !== "" &&
    shippingCountry.trim() !== "";

  const fieldsDisabled = useSameAddress;

  return (
    <AppLayout>
      <div className="mb-6">
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
        <h2 className="text-2xl font-bold mt-4">{t("shipping.title")}</h2>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">{t("shipping.noTenantProfile")}</p>
      ) : (
        <div className="grid gap-6 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("shipping.shippingAddress")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCheckbox && (
                <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/50 p-3">
                  <Checkbox
                    id="same_address"
                    checked={useSameAddress}
                    onCheckedChange={(checked) => handleSyncToggle(!!checked)}
                  />
                  <Label htmlFor="same_address" className="cursor-pointer font-normal">
                    {t("shipping.sameAddressAs", { name: referenceTenant!.company_name })}
                  </Label>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="shipping_recipient">{t("shipping.recipientName")}</Label>
                <Input id="shipping_recipient" value={shippingRecipient} onChange={(e) => setShippingRecipient(e.target.value)} placeholder={t("shipping.recipientPlaceholder")} disabled={fieldsDisabled} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_co">{t("shipping.coName")}</Label>
                <Input id="shipping_co" value={shippingCo} onChange={(e) => setShippingCo(e.target.value)} placeholder={t("shipping.coPlaceholder")} disabled={fieldsDisabled} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_address">{t("shipping.address")}</Label>
                <Input id="shipping_address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder={t("shipping.addressPlaceholder")} disabled={fieldsDisabled} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_zip">Postnummer *</Label>
                  <Input id="shipping_zip" value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="Postnr." disabled={fieldsDisabled} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_city">By *</Label>
                  <Input id="shipping_city" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="By" disabled={fieldsDisabled} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_state">Stat</Label>
                <Input id="shipping_state" value={shippingState} onChange={(e) => setShippingState(e.target.value)} placeholder="Stat (valgfrit)" disabled={fieldsDisabled} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_country">Land *</Label>
                <Input id="shipping_country" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder="F.eks. Danmark" disabled={fieldsDisabled} />
              </div>
              <Button onClick={() => shippingMutation.mutate()} disabled={!hasShippingChanges || !shippingValid || shippingMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {shippingMutation.isPending ? "Gemmer..." : "Gem forsendelsesadresse"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default ShippingAddressPage;
