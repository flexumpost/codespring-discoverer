import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface DefaultActionSetupProps {
  tenantId: string;
  tenantTypeName: string;
}

export function DefaultActionSetup({ tenantId, tenantTypeName }: DefaultActionSetupProps) {
  const queryClient = useQueryClient();
  const [mailAction, setMailAction] = useState("");
  const [packageAction, setPackageAction] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          default_mail_action: mailAction,
          default_package_action: packageAction,
        } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tenants"] });
      toast.success("Standardhandling gemt!");
    },
    onError: () => {
      toast.error("Kunne ikke gemme standardhandling");
    },
  });

  const isValid = mailAction !== "" && packageAction !== "";

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Vælg standardhandling</DialogTitle>
          <DialogDescription>
            Inden du kan fortsætte, skal du vælge hvad der som standard skal ske med dine breve og pakker.
            Du kan altid ændre dette senere under Indstillinger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending ? "Gemmer..." : "Gem og fortsæt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
