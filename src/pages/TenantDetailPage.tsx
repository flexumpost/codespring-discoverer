import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, User } from "lucide-react";
import { MailPricingCard, PackagePricingCard } from "@/components/PricingOverview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ["tenant-users", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("id, user_id, profiles(full_name, email)")
        .eq("tenant_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const TYPE_ORDER = ["Fastlejer", "Lite", "Standard", "Plus", "Retur til afsender", "Nabo"];

  const { data: tenantTypes = [] } = useQuery({
    queryKey: ["tenant-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_types").select("id, name");
      if (error) throw error;
      return data.sort((a, b) => {
        const ai = TYPE_ORDER.indexOf(a.name);
        const bi = TYPE_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    },
  });

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingRecipient, setShippingRecipient] = useState("");
  const [shippingCo, setShippingCo] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");

  useEffect(() => {
    if (tenant) {
      setContactName(tenant.contact_name ?? "");
      setContactEmail(tenant.contact_email ?? "");
      setSelectedTypeId(tenant.tenant_type_id);
      setShippingRecipient(tenant.shipping_recipient ?? "");
      setShippingCo(tenant.shipping_co ?? "");
      setShippingAddress(tenant.shipping_address ?? "");
      setShippingZip(tenant.shipping_zip ?? "");
      setShippingCity(tenant.shipping_city ?? "");
      setShippingCountry(tenant.shipping_country ?? "");
    }
  }, [tenant]);

  const typeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ tenant_type_id: selectedTypeId })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      toast.success("Lejertype opdateret");
    },
    onError: () => toast.error("Kunne ikke gemme lejertype"),
  });

  const contactMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ contact_name: contactName, contact_email: contactEmail })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      toast.success("Kontaktoplysninger gemt");
    },
    onError: () => toast.error("Kunne ikke gemme"),
  });

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
          shipping_country: shippingCountry,
        } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      toast.success("Forsendelsesadresse gemt");
    },
    onError: () => toast.error("Kunne ikke gemme"),
  });

  const typeName = (tenant?.tenant_types as any)?.name as string | undefined;
  const typeChanged = tenant && selectedTypeId !== tenant.tenant_type_id;

  const contactChanged =
    tenant &&
    (contactName !== (tenant.contact_name ?? "") ||
      contactEmail !== (tenant.contact_email ?? ""));

  const shippingChanged =
    tenant &&
    (shippingRecipient !== (tenant.shipping_recipient ?? "") ||
      shippingCo !== (tenant.shipping_co ?? "") ||
      shippingAddress !== (tenant.shipping_address ?? "") ||
      shippingZip !== (tenant.shipping_zip ?? "") ||
      shippingCity !== (tenant.shipping_city ?? "") ||
      shippingCountry !== (tenant.shipping_country ?? ""));

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tenants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isLoading ? "Indlæser..." : tenant?.company_name ?? "Lejer ikke fundet"}
        </h2>
        {typeName && (
          <Badge variant="outline" className={TYPE_COLORS[typeName] ?? ""}>
            {typeName}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : !tenant ? (
        <p className="text-muted-foreground">Lejer ikke fundet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company + Contact + Shipping */}
          <div className="space-y-6">
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
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Lejertype</Label>
                  <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg lejertype" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => typeMutation.mutate()} disabled={!typeChanged || typeMutation.isPending} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {typeMutation.isPending ? "Gemmer..." : "Gem type"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kontaktoplysninger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Kontaktperson</Label>
                  <Input id="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Fulde navn" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Kontakt-email</Label>
                  <Input id="contact_email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@eksempel.dk" />
                </div>
                <Button onClick={() => contactMutation.mutate()} disabled={!contactChanged || contactMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {contactMutation.isPending ? "Gemmer..." : "Gem"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Forsendelsesadresse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Modtager</Label>
                  <Input value={shippingRecipient} onChange={(e) => setShippingRecipient(e.target.value)} placeholder="Modtager navn" />
                </div>
                <div className="space-y-2">
                  <Label>c/o</Label>
                  <Input value={shippingCo} onChange={(e) => setShippingCo(e.target.value)} placeholder="c/o (valgfrit)" />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Gadenavn og nummer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Postnummer</Label>
                    <Input value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="Postnr." />
                  </div>
                  <div className="space-y-2">
                    <Label>By</Label>
                    <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="By" />
          </div>

          {/* Postmodtagere card between column 1 and pricing */}
          {tenantUsers.length > 0 && (
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Postmodtagere</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenantUsers.map((tu: any) => {
                      const profile = tu.profiles as any;
                      return (
                        <div key={tu.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{profile?.full_name || "Uden navn"}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
                </div>
                <div className="space-y-2">
                  <Label>Land</Label>
                  <Input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder="F.eks. Danmark" />
                </div>
                <Button onClick={() => shippingMutation.mutate()} disabled={!shippingChanged || shippingMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {shippingMutation.isPending ? "Gemmer..." : "Gem adresse"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Mail pricing */}
          <MailPricingCard tenantTypeName={typeName} tenant={tenant as any} />

          {/* Column 3: Package pricing */}
          <PackagePricingCard tenantTypeName={typeName} tenant={tenant as any} />
        </div>
      )}
    </AppLayout>
  );
};

export default TenantDetailPage;
