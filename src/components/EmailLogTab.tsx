import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { da, enGB } from "date-fns/locale";

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

export function EmailLogTab() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "da" ? da : enGB;
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

  function statusBadge(status: string) {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{t("emailLog.sent")}</Badge>;
      case "failed":
      case "dlq":
        return <Badge variant="destructive">{t("emailLog.failed")}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{t("emailLog.pending")}</Badge>;
      case "suppressed":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{t("emailLog.suppressed")}</Badge>;
      case "bounced":
        return <Badge variant="destructive">{t("emailLog.bounced")}</Badge>;
      case "complained":
        return <Badge variant="destructive">{t("emailLog.complained")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["email-log", page, debouncedSearch],
    queryFn: async () => {
      const res = await supabase.functions.invoke("get-email-log", {
        body: { offset: page * PAGE_SIZE, limit: PAGE_SIZE, search: debouncedSearch || undefined },
      });
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
        {t("emailLog.couldNotFetch")}: {String(error)}
      </p>
    );
  }

  if (logs.length === 0 && page === 0) {
    return <p className="text-muted-foreground py-4">{t("emailLog.noEmails")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("emailLog.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("emailLog.date")}</TableHead>
            <TableHead>{t("emailLog.template")}</TableHead>
            <TableHead>{t("emailLog.recipient")}</TableHead>
            <TableHead>{t("emailLog.status")}</TableHead>
            <TableHead>{t("emailLog.error")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(log.created_at), "dd. MMM yyyy HH:mm", { locale: dateLocale })}
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
    </div>
  );
}
