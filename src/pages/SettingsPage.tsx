import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import { TenantSelector } from "@/components/TenantSelector";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PricingOverview } from "@/components/PricingOverview";
import { DefaultActionCard } from "@/components/DefaultActionCard";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const SettingsPage = () => {
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [shippingRecipient, setShippingRecipient] = useState("");
  const [shippingCo, setShippingCo] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");

  useEffect(() => {
    if (selectedTenant) {
      setContactName(selectedTenant.contact_name ?? "");
      setContactEmail(selectedTenant.contact_email ?? "");
      setShippingRecipient((selectedTenant as any).shipping_recipient ?? "");
      setShippingCo((selectedTenant as any).shipping_co ?? "");
      setShippingAddress((selectedTenant as any).shipping_address ?? "");
      setShippingZip((selectedTenant as any).shipping_zip ?? "");
      setShippingCity((selectedTenant as any).shipping_city ?? "");
      setShippingState((selectedTenant as any).shipping_state ?? "");
      setShippingCountry((selectedTenant as any).shipping_country ?? "");
    }
  }, [selectedTenant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ contact_name: contactName, contact_email: contactEmail })
        .eq("id", selectedTenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Indstillinger gemt");
    },
    onError: () => {
      toast.error("Kunne ikke gemme indstillinger");
    },
  });

  const typeName = (selectedTenant?.tenant_types as any)?.name as string | undefined;
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
        } as any)
        .eq("id", selectedTenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Forsendelsesadresse gemt");
    },
    onError: () => {
      toast.error("Kunne ikke gemme forsendelsesadresse");
    },
  });

  const hasChanges =
    selectedTenant &&
    (contactName !== (selectedTenant.contact_name ?? "") ||
      contactEmail !== (selectedTenant.contact_email ?? ""));

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

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Indstillinger</h2>
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">
          Ingen lejer-profil fundet for din konto.
        </p>
      ) : (
        <div className="grid gap-6 max-w-lg">
          {/* Company info (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Virksomhed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Firmanavn</Label>
                <p className="font-medium">{selectedTenant.company_name}</p>
              </div>
              {selectedTenant.address && (
                <div>
                  <Label className="text-muted-foreground text-xs">Adresse</Label>
                  <p className="font-medium">{selectedTenant.address}</p>
                </div>
              )}
              {typeName && (
                <div>
                  <Label className="text-muted-foreground text-xs">Lejertype</Label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={TYPE_COLORS[typeName] ?? ""}
                    >
                      {typeName}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontaktoplysninger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Kontaktperson</Label>
                <Input
                  id="contact_name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Fulde navn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Kontakt-email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@eksempel.dk"
                />
              </div>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={!hasChanges || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Gemmer..." : "Gem"}
              </Button>
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forsendelsesadresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_recipient">Modtager navn *</Label>
                <Input
                  id="shipping_recipient"
                  value={shippingRecipient}
                  onChange={(e) => setShippingRecipient(e.target.value)}
                  placeholder="Modtager navn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_co">c/o navn</Label>
                <Input
                  id="shipping_co"
                  value={shippingCo}
                  onChange={(e) => setShippingCo(e.target.value)}
                  placeholder="c/o (valgfrit)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_address">Adresse *</Label>
                <Input
                  id="shipping_address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Gadenavn og nummer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_zip">Postnummer *</Label>
                  <Input
                    id="shipping_zip"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    placeholder="Postnr."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_city">By *</Label>
                  <Input
                    id="shipping_city"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="By"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_state">Stat</Label>
                <Input
                  id="shipping_state"
                  value={shippingState}
                  onChange={(e) => setShippingState(e.target.value)}
                  placeholder="Stat (valgfrit)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_country">Land *</Label>
                <Input
                  id="shipping_country"
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value)}
                  placeholder="F.eks. Danmark"
                />
              </div>
              <Button
                onClick={() => shippingMutation.mutate()}
                disabled={!hasShippingChanges || !shippingValid || shippingMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {shippingMutation.isPending ? "Gemmer..." : "Gem forsendelsesadresse"}
              </Button>
            </CardContent>
          </Card>
          {/* Pricing overview */}
          <PricingOverview tenantTypeName={typeName} />

          {/* Default action */}
          <DefaultActionCard
            tenant={selectedTenant as any}
            tenantTypeName={typeName}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default SettingsPage;
