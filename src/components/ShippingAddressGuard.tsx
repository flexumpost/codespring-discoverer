import { useState, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  children: ReactNode;
}

export function ShippingAddressGuard({ children }: Props) {
  const { t } = useTranslation();
  const { tenants, selectedTenant, isLoading } = useTenants();
  const queryClient = useQueryClient();

  const tenant = selectedTenant as any;

  const hasAddress =
    tenant &&
    tenant.shipping_recipient?.trim() &&
    tenant.shipping_address?.trim() &&
    tenant.shipping_zip?.trim() &&
    tenant.shipping_city?.trim() &&
    tenant.shipping_country?.trim();

  const confirmed = tenant?.shipping_confirmed === true;
  const needsGuard = tenant && (!confirmed || !hasAddress);

  const [recipient, setRecipient] = useState("");
  const [co, setCo] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const referenceTenant = tenants.find(
    (t) =>
      t.id !== tenant?.id &&
      (t as any).shipping_recipient?.trim() &&
      (t as any).shipping_address?.trim() &&
      (t as any).shipping_zip?.trim() &&
      (t as any).shipping_city?.trim() &&
      (t as any).shipping_country?.trim()
  );

  const showCheckbox = tenants.length > 1 && !!referenceTenant;

  if (tenant && needsGuard && !initialized) {
    setRecipient(tenant.shipping_recipient ?? "");
    setCo(tenant.shipping_co ?? "");
    setAddress(tenant.shipping_address ?? "");
    setZip(tenant.shipping_zip ?? "");
    setCity(tenant.shipping_city ?? "");
    setState(tenant.shipping_state ?? "");
    setCountry(tenant.shipping_country ?? "");
    setInitialized(true);
  }

  const handleSyncToggle = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked && referenceTenant) {
      const ref = referenceTenant as any;
      setRecipient(ref.shipping_recipient ?? "");
      setCo(ref.shipping_co ?? "");
      setAddress(ref.shipping_address ?? "");
      setZip(ref.shipping_zip ?? "");
      setCity(ref.shipping_city ?? "");
      setState(ref.shipping_state ?? "");
      setCountry(ref.shipping_country ?? "");
    }
  };

  const valid =
    recipient.trim() !== "" &&
    address.trim() !== "" &&
    zip.trim() !== "" &&
    city.trim() !== "" &&
    country.trim() !== "";

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          shipping_recipient: recipient,
          shipping_co: co || null,
          shipping_address: address,
          shipping_zip: zip,
          shipping_city: city,
          shipping_state: state || null,
          shipping_country: country,
          shipping_confirmed: true,
        } as any)
        .eq("id", tenant.id);
      if (error) throw error;

      const { data: verify } = await supabase
        .from("tenants")
        .select("shipping_confirmed")
        .eq("id", tenant.id)
        .single();
      if (!verify?.shipping_confirmed) {
        throw new Error(t("shippingGuard.updateNotSaved"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success(t("shippingGuard.addressConfirmed"));
    },
    onError: (err: any) => {
      console.error("ShippingAddressGuard save error:", err);
      toast.error(err?.message || t("shippingGuard.couldNotSave"));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!needsGuard) {
    return <>{children}</>;
  }

  const title = hasAddress
    ? t("shippingGuard.confirmTitle")
    : t("shippingGuard.createTitle");
  const description = !confirmed
    ? t("shippingGuard.confirmDesc")
    : t("shippingGuard.createDesc");

  const fieldsDisabled = useSameAddress;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showCheckbox && (
            <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/50 p-3">
              <Checkbox
                id="guard_same_address"
                checked={useSameAddress}
                onCheckedChange={(checked) => handleSyncToggle(!!checked)}
              />
              <Label htmlFor="guard_same_address" className="cursor-pointer font-normal">
                {t("shippingGuard.sameAddressAs", { name: referenceTenant!.company_name })}
              </Label>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="guard_recipient">{t("shipping.recipientName")}</Label>
            <Input id="guard_recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t("shipping.recipientPlaceholder")} disabled={fieldsDisabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guard_co">{t("shipping.coName")}</Label>
            <Input id="guard_co" value={co} onChange={(e) => setCo(e.target.value)} placeholder={t("shipping.coPlaceholder")} disabled={fieldsDisabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guard_address">{t("shipping.address")}</Label>
            <Input id="guard_address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("shipping.addressPlaceholder")} disabled={fieldsDisabled} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guard_zip">{t("shipping.zipCode")}</Label>
              <Input id="guard_zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder={t("shipping.zipPlaceholder")} disabled={fieldsDisabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guard_city">{t("shipping.city")}</Label>
              <Input id="guard_city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("shipping.cityPlaceholder")} disabled={fieldsDisabled} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guard_state">{t("shipping.state")}</Label>
            <Input id="guard_state" value={state} onChange={(e) => setState(e.target.value)} placeholder={t("shipping.statePlaceholder")} disabled={fieldsDisabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guard_country">{t("shipping.country")}</Label>
            <Input id="guard_country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("shipping.countryPlaceholder")} disabled={fieldsDisabled} />
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {hasAddress ? t("shippingGuard.confirmAddress") : t("shippingGuard.saveAddress")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
