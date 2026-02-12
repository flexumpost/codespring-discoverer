import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-purple-100 text-purple-800 border-purple-200",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["my-tenant-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (tenant) {
      setContactName(tenant.contact_name ?? "");
      setContactEmail(tenant.contact_email ?? "");
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ contact_name: contactName, contact_email: contactEmail })
        .eq("id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenant-settings"] });
      toast.success("Indstillinger gemt");
    },
    onError: () => {
      toast.error("Kunne ikke gemme indstillinger");
    },
  });

  const typeName = (tenant?.tenant_types as any)?.name as string | undefined;
  const hasChanges =
    tenant &&
    (contactName !== (tenant.contact_name ?? "") ||
      contactEmail !== (tenant.contact_email ?? ""));

  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-6">Indstillinger</h2>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : !tenant ? (
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
                <p className="font-medium">{tenant.company_name}</p>
              </div>
              {tenant.address && (
                <div>
                  <Label className="text-muted-foreground text-xs">Adresse</Label>
                  <p className="font-medium">{tenant.address}</p>
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
        </div>
      )}
    </AppLayout>
  );
};

export default SettingsPage;
