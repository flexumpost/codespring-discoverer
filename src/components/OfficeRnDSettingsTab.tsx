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

      <TestConnectionCard />

      <InvoiceFlagCard />




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
                    <TableHead>Plan</TableHead>
                    <TableHead>Type</TableHead>
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
                            log.status === "success" || log.status === "confirmed"
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
                      <TableCell className="text-xs max-w-36 truncate">{log.plan_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{log.plan_type ?? "—"}</TableCell>
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

interface TestStep { step: string; ok: boolean; detail?: string }

function TestConnectionCard() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [itemName, setItemName] = useState("Brev forsendelse (Lite)");
  const [steps, setSteps] = useState<TestStep[] | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const test = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-officernd-connection", {
        body: { email: email || null, item_name: itemName || null },
      });
      if (error) throw error;
      return data as { success: boolean; steps: TestStep[]; error?: string };
    },
    onSuccess: (data) => {
      setSteps(data.steps ?? []);
      setTopError(data.success ? null : data.error ?? "Test fejlede");
      toast({
        title: data.success ? "Test gennemført" : "Test fejlede",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: any) => {
      setSteps(null);
      setTopError(err?.message ?? String(err));
      toast({ title: "Fejl", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test forbindelse (v2)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verificér token, member-opslag og fee-opslag mod OfficeRnD v2 API.
          Opretter ingen charges.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          <div className="space-y-1">
            <Label htmlFor="test-email">Test-email (valgfri)</Label>
            <Input
              id="test-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lejer@eksempel.dk"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="test-item">Plan/Fee-navn (valgfri)</Label>
            <Input
              id="test-item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="f.eks. Brev forsendelse (Lite)"
            />
          </div>
        </div>
        <Button onClick={() => test.mutate()} disabled={test.isPending} size="sm">
          {test.isPending ? "Tester..." : "Kør test"}
        </Button>

        {topError && (
          <p className="text-sm text-destructive">{topError}</p>
        )}

        {steps && steps.length > 0 && (
          <div className="space-y-1.5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant={s.ok ? "default" : "destructive"}>{s.ok ? "OK" : "FEJL"}</Badge>
                <div>
                  <div className="font-medium">{s.step}</div>
                  {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function InvoiceFlagCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["officernd-invoice-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("officernd_invoice_log" as any)
        .select("*, tenants(company_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any as Array<{
        id: string;
        tenant_id: string | null;
        invoice_id: string | null;
        old_status: string | null;
        new_status: string | null;
        has_unpaid_invoice: boolean | null;
        source: string | null;
        note: string | null;
        created_at: string;
        tenants: { company_name: string } | null;
      }>;
    },
  });

  const reconcile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-officernd-invoices", { body: {} });
      if (error) throw error;
      return data as { checked?: number; changed?: number; unresolved?: number; error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["officernd-invoice-log"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast({
        title: "Afstemning gennemført",
        description: `Kontrolleret: ${data?.checked ?? 0} · Ændret: ${data?.changed ?? 0} · Uden match: ${data?.unresolved ?? 0}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Afstemning fejlede", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubetalte fakturaer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Lejere markeres automatisk med “Ubetalt faktura”, når OfficeRnD melder en
          faktura som fejlet eller forfalden — og markeringen fjernes igen, når
          fakturaen betales. Afstemning kører automatisk hver nat.
        </p>
        <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending} size="sm">
          {reconcile.isPending ? "Afstemmer..." : "Afstem nu"}
        </Button>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Indlæser...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ingen faktura-hændelser endnu.</p>
        ) : (
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tidspunkt</TableHead>
                  <TableHead>Lejer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Markering</TableHead>
                  <TableHead>Kilde</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm max-w-40 truncate">
                      {log.tenants?.company_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.old_status ?? "—"} → {log.new_status ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.has_unpaid_invoice ? "destructive" : "default"}>
                        {log.has_unpaid_invoice ? "Ubetalt" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.source ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                      {log.note ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
