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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";

const PAGE_SIZE = 50;

function formatDuration(loginAt: string, lastSeen: string): string {
  const diffMs = new Date(lastSeen).getTime() - new Date(loginAt).getTime();
  if (diffMs < 0) return "–";
  const totalSec = Math.floor(diffMs / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}t ${remMins}m`;
}

export function LoginLogTab() {
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState<"tenant" | "operator">("tenant");
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
    queryKey: ["login-log", page, debouncedSearch, roleFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_login_logs", {
        _role: roleFilter === "operator" ? "operator" : "tenant",
        _search: debouncedSearch,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const logs = data || [];
      const total = logs.length > 0 ? Number((logs[0] as any).total_count) : 0;
      return { logs, total };
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
        Kunne ikke hente login-log: {String(error)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={roleFilter}
        onValueChange={(v) => {
          setRoleFilter(v as "tenant" | "operator");
          setPage(0);
        }}
        className="flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="tenant" id="role-tenant" />
          <Label htmlFor="role-tenant" className="cursor-pointer">Lejere</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="operator" id="role-operator" />
          <Label htmlFor="role-operator" className="cursor-pointer">Operatører</Label>
        </div>
      </RadioGroup>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søg på email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {logs.length === 0 && page === 0 ? (
        <p className="text-muted-foreground py-4">Ingen logins registreret endnu.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead>Bruger</TableHead>
                <TableHead>Varighed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.logged_in_at), "dd. MMM yyyy HH:mm", { locale: da })}
                  </TableCell>
                  <TableCell>{log.email}</TableCell>
                  <TableCell>{formatDuration(log.logged_in_at, log.last_seen_at)}</TableCell>
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
        </>
      )}
    </div>
  );
}
