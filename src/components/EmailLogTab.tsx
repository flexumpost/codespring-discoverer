import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";

const PAGE_SIZE = 50;

interface EmailLogEntry {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Sendt</Badge>;
    case "failed":
    case "dlq":
      return <Badge variant="destructive">Fejlet</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Afventer</Badge>;
    case "suppressed":
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Undertrykt</Badge>;
    case "bounced":
      return <Badge variant="destructive">Bounced</Badge>;
    case "complained":
      return <Badge variant="destructive">Klage</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function EmailLogTab() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["email-log", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        offset: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await supabase.functions.invoke(
        `get-email-log?${params.toString()}`
      );
      if (res.error) throw res.error;
      return res.data as { logs: EmailLogEntry[]; total: number };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive py-4">
        Kunne ikke hente email-log: {String(error)}
      </p>
    );
  }

  if (logs.length === 0 && page === 0) {
    return <p className="text-muted-foreground py-4">Ingen emails sendt endnu.</p>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dato</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Modtager</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fejl</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(log.created_at), "dd. MMM yyyy HH:mm", { locale: da })}
              </TableCell>
              <TableCell className="font-mono text-xs">{log.template_name}</TableCell>
              <TableCell>{log.recipient_email}</TableCell>
              <TableCell>{statusBadge(log.status)}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {log.error_message || "–"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Side {page + 1} af {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Forrige
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Næste <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
