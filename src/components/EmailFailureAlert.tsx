import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FailureData {
  count: number;
  latest: { recipient_email: string; template_name: string; error_message: string | null; created_at: string }[];
  since: string;
}

const DISMISS_KEY = "email-failure-dismissed-at";
const DISMISS_HOURS = 1;

export function EmailFailureAlert() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [shownThisSession, setShownThisSession] = useState(false);

  const { data } = useQuery({
    queryKey: ["email-failure-check"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("check-email-failures", { body: {} });
      if (res.error) throw res.error;
      return res.data as FailureData;
    },
    refetchInterval: 5 * 60 * 1000, // every 5 min
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!data || data.count === 0 || shownThisSession) return;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const ageHours = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < DISMISS_HOURS) return;
    }
    setOpen(true);
    setShownThisSession(true);
  }, [data, shownThisSession]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setOpen(false);
  };

  if (!data || data.count === 0) return null;

  return (
    <>
      {/* Persistent header banner */}
      <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm text-destructive flex-1">
          <strong>{data.count}</strong> e-mail{data.count === 1 ? "" : "s"} kunne ikke leveres i de sidste 24 timer.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/operator-settings?tab=email-log")}
        >
          Vis e-mail log
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Detaljer
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              E-mail levering fejler
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{data.count}</strong> e-mail{data.count === 1 ? "" : "s"} kunne ikke leveres i de sidste 24 timer.
                  Tjek om afsenderdomænet er korrekt verificeret.
                </p>
                {data.latest.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1 max-h-48 overflow-auto">
                    {data.latest.map((f, i) => (
                      <div key={i} className="border-b border-border last:border-0 pb-1 last:pb-0">
                        <div className="font-mono">{f.template_name} → {f.recipient_email}</div>
                        {f.error_message && (
                          <div className="text-muted-foreground truncate" title={f.error_message}>
                            {f.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismiss}>Luk i 1 time</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setOpen(false); navigate("/operator-settings?tab=email-log"); }}>
              Gå til e-mail log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
