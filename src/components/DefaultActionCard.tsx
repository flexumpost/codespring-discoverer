import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface DefaultActionCardProps {
  tenant: {
    id: string;
    default_mail_action?: string | null;
    default_package_action?: string | null;
  };
  tenantTypeName: string | undefined;
}

export function DefaultActionCard({ tenant, tenantTypeName }: DefaultActionCardProps) {
  const queryClient = useQueryClient();
  const [mailAction, setMailAction] = useState(tenant.default_mail_action ?? "");
  const [packageAction, setPackageAction] = useState(tenant.default_package_action ?? "");

  useEffect(() => {
    setMailAction(tenant.default_mail_action ?? "");
    setPackageAction(tenant.default_package_action ?? "");
  }, [tenant.id, tenant.default_mail_action, tenant.default_package_action]);

  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) {
    return null;
  }

  const hasChanges =
    mailAction !== (tenant.default_mail_action ?? "") ||
    packageAction !== (tenant.default_package_action ?? "");

  const isValid = mailAction !== "" && packageAction !== "";

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          default_mail_action: mailAction,
          default_package_action: packageAction,
        } as any)
        .eq("id", tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Standardhandling gemt");
    },
    onError: () => {
      toast.error("Kunne ikke gemme standardhandling");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Standardhandling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vælg hvad der som standard skal ske med dine breve og pakker. Du kan altid ændre handling for den enkelte forsendelse.
        </p>
        <div className="space-y-2">
          <Label>Standard handling for breve</Label>
          <Select value={mailAction} onValueChange={setMailAction}>
            <SelectTrigger>
              <SelectValue placeholder="Vælg handling..." />
            </SelectTrigger>
            <SelectContent>
              {MAIL_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Standard handling for pakker</Label>
          <Select value={packageAction} onValueChange={setPackageAction}>
            <SelectTrigger>
              <SelectValue placeholder="Vælg handling..." />
            </SelectTrigger>
            <SelectContent>
              {PACKAGE_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!hasChanges || !isValid || mutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {mutation.isPending ? "Gemmer..." : "Gem standardhandling"}
        </Button>
      </CardContent>
    </Card>
  );
}
