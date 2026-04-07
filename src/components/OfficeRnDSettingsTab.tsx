import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function OfficeRnDSettingsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["officernd-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("officernd_settings" as any)
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as any as { id: number; enabled: boolean; org_slug: string | null; updated_at: string };
    },
  });

  const [orgSlug, setOrgSlug] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setOrgSlug(settings.org_slug ?? "");
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async (vals: { enabled?: boolean; org_slug?: string }) => {
      const { error } = await supabase
        .from("officernd_settings" as any)
        .update({ ...vals, updated_at: new Date().toISOString() } as any)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd-settings"] });
      toast({ title: "Indstillinger gemt" });
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["officernd-sync-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("officernd_sync_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any as Array<{
        id: string;
        mail_item_id: string;
        charge_id: string | null;
        amount_text: string | null;
        status: string;
        error_message: string | null;
        created_at: string;
        plan_name: string | null;
        plan_type: string | null;
        member_id: string | null;
      }>;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OfficeRnD Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings?.enabled ?? false}
              onCheckedChange={(checked) => updateMutation.mutate({ enabled: checked })}
              disabled={settingsLoading}
            />
            <Label>{settings?.enabled ? "Aktiveret" : "Deaktiveret"}</Label>
          </div>

          <div className="space-y-2 max-w-md">
            <Label htmlFor="org-slug">Organisation Slug</Label>
            <div className="flex gap-2">
              <Input
                id="org-slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="f.eks. din-organisation"
              />
              <Button
                onClick={() => updateMutation.mutate({ org_slug: orgSlug })}
                disabled={updateMutation.isPending}
                size="sm"
              >
                Gem
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Findes under Settings → My Account i OfficeRnD
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-muted-foreground text-sm">Indlæser...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ingen sync-hændelser endnu.</p>
          ) : (
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tidspunkt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Beløb</TableHead>
                    <TableHead>Charge ID</TableHead>
                    <TableHead>Fejl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success"
                              ? "default"
                              : log.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.amount_text ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                        {log.charge_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-48 truncate">
                        {log.error_message ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
