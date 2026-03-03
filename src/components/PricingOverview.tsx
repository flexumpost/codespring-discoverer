import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

const MAIL_ACTIONS = [
  { value: "send", label: "Forsendelse" },
  { value: "afhentning", label: "Afhentning" },
  { value: "scan", label: "Scanning" },
];

const PACKAGE_ACTIONS = [
  { value: "send", label: "Forsendelse" },
  { value: "afhentning", label: "Afhentning" },
];

const MAIL_PRICING: Record<string, { forklaring: string; forsendelsesdag: string; ekstraForsendelse: string; ekstraScanning: string; ekstraAfhentning: string }> = {
  Lite: {
    forklaring: "Scanning fortages gratis den første torsdag i måneden. Afhentning kan ske gratis den første torsdag i måneden, skal bookes. Forsendelse er gratis, men tillægges porto.",
    forsendelsesdag: "Første torsdag i måneden",
    ekstraForsendelse: "50 kr. pr. forsendelse + porto",
    ekstraScanning: "50 kr.",
    ekstraAfhentning: "50 kr. (Skal bookes)",
  },
  Standard: {
    forklaring: "Scanning fortages gratis hver torsdag. Afhentning kan ske gratis den hver torsdag, skal bookes. Forsendelse sker hver torsdag og tillægges porto.",
    forsendelsesdag: "Hver torsdag",
    ekstraForsendelse: "Ingen ekstra forsendelse",
    ekstraScanning: "30 kr.",
    ekstraAfhentning: "30 kr. (Skal bookes)",
  },
  Plus: {
    forklaring: "Scanning fortages gratis alle hverdage. Afhentning kan ske gratis på alle hverdage, skal bookes. Forsendelse sker hver torsdag, gratis porto.",
    forsendelsesdag: "Hver torsdag",
    ekstraForsendelse: "Ingen ekstra forsendelse",
    ekstraScanning: "0 kr.",
    ekstraAfhentning: "0 kr. (Skal bookes)",
  },
};

const PACKAGE_PRICING: Record<string, { haandteringsgebyr: string; afhentning: string; forsendelse: string }> = {
  Lite: {
    haandteringsgebyr: "50 kr.",
    afhentning: "Afhentning kan ske hver torsdag efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
  Standard: {
    haandteringsgebyr: "30 kr.",
    afhentning: "Afhentning kan ske hver torsdag efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
  Plus: {
    haandteringsgebyr: "10 kr.",
    afhentning: "Afhentning kan ske efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
};

interface TenantProp {
  id: string;
  default_mail_action?: string | null;
  default_package_action?: string | null;
}

interface PricingCardProps {
  tenantTypeName: string | undefined;
  tenant?: TenantProp;
}

export function MailPricingCard({ tenantTypeName, tenant }: PricingCardProps) {
  const queryClient = useQueryClient();
  const [mailAction, setMailAction] = useState(tenant?.default_mail_action ?? "");

  useEffect(() => {
    setMailAction(tenant?.default_mail_action ?? "");
  }, [tenant?.id, tenant?.default_mail_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const mail = MAIL_PRICING[tenantTypeName];
  const mailChanged = tenant && mailAction !== (tenant.default_mail_action ?? "");

  const mailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ default_mail_action: mailAction } as any)
        .eq("id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Standard brevhandling gemt");
    },
    onError: () => toast.error("Kunne ikke gemme"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Breve — priser og betingelser ({tenantTypeName})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenant && (
          <div className="space-y-3 border-b pb-4 mb-2">
            <Label>Standard handling for breve</Label>
            <div className="flex items-center gap-2">
              <Select value={mailAction} onValueChange={setMailAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Vælg handling..." />
                </SelectTrigger>
                <SelectContent>
                  {MAIL_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => mailMutation.mutate()}
                disabled={!mailChanged || !mailAction || mailMutation.isPending}
              >
                <Save className="mr-1 h-4 w-4" />
                {mailMutation.isPending ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          </div>
        )}
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          {mail.forklaring}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Emne</TableHead>
              <TableHead>Betingelse / Pris</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Forsendelsesdag</TableCell><TableCell>{mail.forsendelsesdag}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Ekstra forsendelse</TableCell><TableCell>{mail.ekstraForsendelse}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Ekstra scanning af post</TableCell><TableCell>{mail.ekstraScanning}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Ekstra afhentning</TableCell><TableCell>{mail.ekstraAfhentning}</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PackagePricingCard({ tenantTypeName, tenant }: PricingCardProps) {
  const queryClient = useQueryClient();
  const [packageAction, setPackageAction] = useState(tenant?.default_package_action ?? "");

  useEffect(() => {
    setPackageAction(tenant?.default_package_action ?? "");
  }, [tenant?.id, tenant?.default_package_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const pkg = PACKAGE_PRICING[tenantTypeName];
  const pkgChanged = tenant && packageAction !== (tenant.default_package_action ?? "");

  const pkgMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ default_package_action: packageAction } as any)
        .eq("id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Standard pakkehandling gemt");
    },
    onError: () => toast.error("Kunne ikke gemme"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pakker — priser og betingelser ({tenantTypeName})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenant && (
          <div className="space-y-3 border-b pb-4 mb-2">
            <Label>Standard handling for pakker</Label>
            <div className="flex items-center gap-2">
              <Select value={packageAction} onValueChange={setPackageAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Vælg handling..." />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => pkgMutation.mutate()}
                disabled={!pkgChanged || !packageAction || pkgMutation.isPending}
              >
                <Save className="mr-1 h-4 w-4" />
                {pkgMutation.isPending ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Emne</TableHead>
              <TableHead>Betingelse / Pris</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Håndteringsgebyr</TableCell><TableCell>{pkg.haandteringsgebyr}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Afhentning</TableCell><TableCell>{pkg.afhentning}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Forsendelse</TableCell><TableCell>{pkg.forsendelse}</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
