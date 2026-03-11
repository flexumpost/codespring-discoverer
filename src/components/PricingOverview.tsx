import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { ReactNode } from "react";

function renderForklaring(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("##")) {
      return (
        <span key={i} className="block font-semibold text-foreground text-base">
          {line.slice(2).trim()}
          {i < lines.length - 1 && <br />}
        </span>
      );
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <span key={i}>
        {parts}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

const MAIL_ACTIONS = [
  { value: "send", label: "Forsendelse" },
  { value: "afhentning", label: "Afhentning" },
  { value: "scan", label: "Scanning" },
];

const PACKAGE_ACTIONS = [
  { value: "send", label: "Forsendelse" },
  { value: "afhentning", label: "Afhentning" },
];

// Fallback defaults if DB has no data
const MAIL_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { forklaring: "", forsendelsesdag: "", ekstraForsendelse: "", ekstraScanning: "", ekstraAfhentning: "" },
  Standard: { forklaring: "", forsendelsesdag: "", ekstraForsendelse: "", ekstraScanning: "", ekstraAfhentning: "" },
  Plus: { forklaring: "", forsendelsesdag: "", ekstraForsendelse: "", ekstraScanning: "", ekstraAfhentning: "" },
};

const PACKAGE_PRICING_DEFAULTS: Record<string, Record<string, string>> = {
  Lite: { haandteringsgebyr: "", afhentning: "", forsendelse: "" },
  Standard: { haandteringsgebyr: "", afhentning: "", forsendelse: "" },
  Plus: { haandteringsgebyr: "", afhentning: "", forsendelse: "" },
};

function usePricingData() {
  return useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("tier, category, field_key, field_value");
      if (error) throw error;

      const mail: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(MAIL_PRICING_DEFAULTS));
      const pkg: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(PACKAGE_PRICING_DEFAULTS));

      (data ?? []).forEach((row: any) => {
        if (row.category === "mail" && mail[row.tier]) {
          mail[row.tier][row.field_key] = row.field_value;
        } else if (row.category === "package" && pkg[row.tier]) {
          pkg[row.tier][row.field_key] = row.field_value;
        }
      });

      return { mail, pkg };
    },
  });
}

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
  const { data: pricing } = usePricingData();

  useEffect(() => {
    setMailAction(tenant?.default_mail_action ?? "");
  }, [tenant?.id, tenant?.default_mail_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const mail = pricing?.mail[tenantTypeName] ?? MAIL_PRICING_DEFAULTS[tenantTypeName];
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
        {mail.forklaring && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {renderForklaring(mail.forklaring)}
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
  const { data: pricing } = usePricingData();

  useEffect(() => {
    setPackageAction(tenant?.default_package_action ?? "");
  }, [tenant?.id, tenant?.default_package_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) return null;

  const pkg = pricing?.pkg[tenantTypeName] ?? PACKAGE_PRICING_DEFAULTS[tenantTypeName];
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
