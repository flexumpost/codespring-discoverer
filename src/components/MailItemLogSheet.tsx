import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Clock } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string | null;
  profile_name: string | null;
  profile_email: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ny: "Ny",
  afventer_handling: "Afventer handling",
  ulaest: "Ulæst",
  laest: "Læst",
  arkiveret: "Arkiveret",
  sendt_med_dao: "Sendt med DAO",
  sendt_med_postnord: "Sendt med PostNord",
};

const ACTION_LABELS: Record<string, string> = {
  scan: "Scan nu",
  send: "Forsendelse",
  afhentning: "Afhentning",
  destruer: "Destruer",
  daglig: "Læg på kontoret",
  standard_forsendelse: "Standard forsendelse",
  standard_scan: "Standard scanning",
};

function formatAction(log: LogEntry): string {
  switch (log.action) {
    case "created":
      return "Forsendelse oprettet";
    case "status_changed":
      return `Status ændret fra "${STATUS_LABELS[log.old_value ?? ""] ?? log.old_value}" til "${STATUS_LABELS[log.new_value ?? ""] ?? log.new_value}"`;
    case "action_chosen":
      return `Handling valgt: ${ACTION_LABELS[log.new_value ?? ""] ?? log.new_value}`;
    case "action_cleared":
      return `Handling nulstillet (var: ${ACTION_LABELS[log.old_value ?? ""] ?? log.old_value})`;
    case "scan_uploaded":
      return "Scanning uploadet";
    case "tenant_assigned":
      return "Tildelt lejer";
    case "notes_changed":
      return "Note opdateret";
    default:
      return log.action;
  }
}

interface Props {
  mailItemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailItemLogSheet({ mailItemId, open, onOpenChange }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !mailItemId) return;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("mail_item_logs" as any)
        .select("id, action, old_value, new_value, created_at, user_id")
        .eq("mail_item_id", mailItemId)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Fetch profile names for all unique user_ids
      const userIds = [...new Set((data as any[]).filter((d) => d.user_id).map((d) => d.user_id))];
      let profileMap: Record<string, { full_name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = { full_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || null, email: p.email };
          }
        }
      }

      setLogs(
        (data as any[]).map((d) => ({
          ...d,
          profile_name: d.user_id ? (profileMap[d.user_id]?.full_name || null) : null,
          profile_email: d.user_id ? (profileMap[d.user_id]?.email || null) : null,
        }))
      );
      setLoading(false);
    })();
  }, [open, mailItemId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Forsendelseslog</SheetTitle>
          <SheetDescription>Alle handlinger for denne forsendelse</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Indlæser…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Ingen log-poster fundet.</p>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-6 py-2">
              {logs.map((log) => (
                <li key={log.id} className="ml-6">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-sm font-medium">{formatAction(log)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString("da-DK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.profile_name || log.profile_email || "System"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
