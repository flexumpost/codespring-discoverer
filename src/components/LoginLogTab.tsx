import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { da, enGB } from "date-fns/locale";

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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "da" ? da : enGB;
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
        {t("loginLog.couldNotFetch")}: {String(error)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={roleFilter}
        onValueChange={(v) => { setRoleFilter(v as "tenant" | "operator"); setPage(0); }}
        className="flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="tenant" id="role-tenant" />
          <Label htmlFor="role-tenant" className="cursor-pointer">{t("loginLog.tenantsFilter")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="operator" id="role-operator" />
          <Label htmlFor="role-operator" className="cursor-pointer">{t("loginLog.operatorsFilter")}</Label>
        </div>
      </RadioGroup>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("loginLog.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {logs.length === 0 && page === 0 ? (
        <p className="text-muted-foreground py-4">{t("loginLog.noLogins")}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loginLog.date")}</TableHead>
                <TableHead>{t("loginLog.user")}</TableHead>
                <TableHead>{t("loginLog.duration")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.logged_in_at), "dd. MMM yyyy HH:mm", { locale: dateLocale })}
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
                {t("common.page")} {page + 1} {t("common.of")} {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> {t("common.previous")}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  {t("common.next")} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
