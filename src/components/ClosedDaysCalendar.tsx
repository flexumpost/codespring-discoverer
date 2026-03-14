import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Trash2 } from "lucide-react";

type ClosedDay = {
  id: string;
  date: string;
  label: string | null;
};

export function ClosedDaysCalendar() {
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingDay, setExistingDay] = useState<ClosedDay | null>(null);

  const fetchClosedDays = async () => {
    const { data, error } = await supabase
      .from("closed_days")
      .select("*")
      .order("date", { ascending: true });
    if (error) {
      toast.error("Kunne ikke hente lukkedage");
    } else {
      setClosedDays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClosedDays();
  }, []);

  const closedDateObjects = closedDays.map((d) => parseISO(d.date));

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const existing = closedDays.find((d) => d.date === dateStr);
    setSelectedDate(day);
    setExistingDay(existing || null);
    setLabel(existing?.label || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { error } = await supabase
      .from("closed_days")
      .insert({ date: dateStr, label: label || null });

    if (error) {
      toast.error("Kunne ikke tilføje lukkedag");
    } else {
      toast.success("Lukkedag tilføjet");
      setDialogOpen(false);
      fetchClosedDays();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("closed_days").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke fjerne lukkedag");
    } else {
      toast.success("Lukkedag fjernet");
      fetchClosedDays();
    }
  };

  const handleDialogDelete = async () => {
    if (!existingDay) return;
    setSaving(true);
    await handleDelete(existingDay.id);
    setDialogOpen(false);
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Indlæser...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Lukkedage</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Klik på en dag for at tilføje eller fjerne en lukkedag. Lukkedage blokerer afhentninger.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="shrink-0">
          <Calendar
            mode="multiple"
            selected={closedDateObjects}
            onDayClick={handleDayClick}
            className="rounded-md border pointer-events-auto"
            modifiers={{ closed: closedDateObjects }}
            modifiersClassNames={{ closed: "bg-destructive text-destructive-foreground" }}
          />
        </div>

        {/* List */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium mb-2">Registrerede lukkedage ({closedDays.length})</h4>
          {closedDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen lukkedage registreret.</p>
          ) : (
            <ScrollArea className="h-[350px] rounded-md border">
              <ul className="space-y-1 p-2">
                {closedDays.map((day) => (
                  <li
                    key={day.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">
                        {format(parseISO(day.date), "d. MMMM yyyy", { locale: da })}
                      </span>
                      {day.label && (
                        <span className="ml-2 text-muted-foreground">— {day.label}</span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleDelete(day.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {existingDay ? "Fjern lukkedag" : "Tilføj lukkedag"}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && (
            <p className="text-sm">
              Dato:{" "}
              <span className="font-medium">
                {format(selectedDate, "d. MMMM yyyy", { locale: da })}
              </span>
            </p>
          )}
          {existingDay ? (
            <p className="text-sm text-muted-foreground">
              Denne dag er allerede registreret som lukkedag. Vil du fjerne den?
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="label">Beskrivelse (valgfri)</Label>
              <Input
                id="label"
                placeholder="F.eks. Kristi himmelfartsdag"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            {existingDay ? (
              <Button
                variant="destructive"
                onClick={handleDialogDelete}
                disabled={saving}
              >
                Fjern lukkedag
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                Tilføj
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
