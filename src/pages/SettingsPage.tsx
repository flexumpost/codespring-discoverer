import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import { useAuth } from "@/hooks/useAuth";
import { TenantSelector } from "@/components/TenantSelector";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { MailPricingCard, PackagePricingCard } from "@/components/PricingOverview";
import { OperatorSettingsTabs } from "@/components/OperatorSettingsTabs";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const SettingsPage = () => {
  const { role } = useAuth();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    if (selectedTenant) {
      setContactName(selectedTenant.contact_name ?? "");
      setContactEmail(selectedTenant.contact_email ?? "");
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

  const hasChanges =
    selectedTenant &&
    (contactName !== (selectedTenant.contact_name ?? "") ||
      contactEmail !== (selectedTenant.contact_email ?? ""));

  // Operator view
  if (role === "operator") {
    return (
      <AppLayout>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Indstillinger</h2>
        </div>
        <OperatorSettingsTabs />
      </AppLayout>
    );
  }

  // Tenant view
  return (
    <AppLayout>
      <div className="mb-6">
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
        <h2 className="text-2xl font-bold mt-4">Indstillinger</h2>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">
          Ingen lejer-profil fundet for din konto.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company + Contact */}
          <div className="space-y-6">
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
          </div>

          {/* Column 2: Mail pricing */}
          <MailPricingCard tenantTypeName={typeName} tenant={selectedTenant as any} />

          {/* Column 3: Package pricing */}
          <PackagePricingCard tenantTypeName={typeName} tenant={selectedTenant as any} />
        </div>
      )}
    </AppLayout>
  );
};

export default SettingsPage;
