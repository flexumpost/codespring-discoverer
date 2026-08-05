import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

type ZohoLog = {
  id: string;
  received_at: string;
  company_name: string | null;
  contact_email: string | null;
  raw_status: string | null;
  resolved_action: string;
  tenant_id: string | null;
  tenant_type_name: string | null;
  address_transfer_status: string | null;
  welcome_email_status: string | null;
  success: boolean;
  error_message: string | null;
  payload: unknown;
};

const ACTION_LABELS: Record<string, string> = {
  oprettet: "Lejer oprettet",
  opdateret: "Lejer opdateret",
  ophoert_samarbejde: "Ophørt samarbejde",
  ignoreret: "Status ignoreret",
  afvist: "Afvist",
  aktiv_adresseservice: "Aktiv adresseservice",
};

const STATUS_LABELS: Record<string, string> = {
  overfoert: "Overført",
  mangler_data: "Mangler data",
  fejlet: "Fejlet",
  ikke_relevant: "—",
  sendt: "Sendt",
  allerede_sendt: "Sendt tidligere",
  ingen_email: "Ingen email",
  ikke_sendt: "Ikke sendt",
};

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const label = STATUS_LABELS[value] ?? value;
  const variant =
    value === "overfoert" || value === "sendt"
      ? "bg-green-100 text-green-800 border-green-200"
      : value === "fejlet" || value === "ikke_sendt"
      ? "bg-red-100 text-red-800 border-red-200"
      : value === "mangler_data" || value === "allerede_sendt" || value === "ingen_email"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={variant}>{label}</Badge>;
}

export function ZohoWebhookLogTab() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["zoho-webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zoho_webhook_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ZohoLog[];
    },
  });

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.resolved_action !== actionFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.company_name ?? "").toLowerCase().includes(q) ||
      (l.contact_email ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: filtered.length,
    failed: filtered.filter((l) => !l.success).length,
    welcomeSent: filtered.filter((l) => l.welcome_email_status === "sendt").length,
    addressOk: filtered.filter((l) => l.address_transfer_status === "overfoert").length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Zoho webhook-log</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Opdater
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Fejlede</p>
            <p className="text-2xl font-semibold text-destructive">{stats.failed}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Adresse overført</p>
            <p className="text-2xl font-semibold">{stats.addressOk}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Velkomstmail sendt</p>
            <p className="text-2xl font-semibold">{stats.welcomeSent}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Søg firma eller email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Handling" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle handlinger</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Indlæser…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen webhook-events endnu.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Tidspunkt</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Zoho-status</TableHead>
                  <TableHead>Handling</TableHead>
                  <TableHead>Lejertype</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Velkomstmail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <>
                    <TableRow
                      key={l.id}
                      className={`cursor-pointer ${!l.success ? "bg-red-50/60" : ""}`}
                      onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                    >
                      <TableCell>
                        {expanded === l.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(l.received_at).toLocaleString("da-DK")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{l.company_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.contact_email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.raw_status ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {ACTION_LABELS[l.resolved_action] ?? l.resolved_action}
                      </TableCell>
                      <TableCell className="text-sm">{l.tenant_type_name ?? "—"}</TableCell>
                      <TableCell><StatusBadge value={l.address_transfer_status} /></TableCell>
                      <TableCell><StatusBadge value={l.welcome_email_status} /></TableCell>
                    </TableRow>
                    {expanded === l.id && (
                      <TableRow key={`${l.id}-details`}>
                        <TableCell colSpan={8} className="bg-muted/40">
                          {l.error_message && (
                            <p className="text-sm text-destructive mb-2">
                              Fejl: {l.error_message}
                            </p>
                          )}
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(l.payload, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
