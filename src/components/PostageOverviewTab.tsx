import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";

const POSTAGE_PRICES: Record<string, number> = {
  dk_0_100: 18.4,
  dk_100_250: 36.8,
  udland_0_100: 46.0,
  udland_100_250: 92.0,
  dk_pakke_0_1: 48.0,
  dk_pakke_1_2: 57.6,
  dk_pakke_2_5: 77.6,
  dk_pakke_5_10: 101.6,
  dk_pakke_10_15: 133.6,
  dk_pakke_15_20: 141.6,
};

const LETTER_OPTIONS = ["dk_0_100", "dk_100_250", "udland_0_100", "udland_100_250"];
const PACKAGE_OPTIONS = ["dk_pakke_0_1", "dk_pakke_1_2", "dk_pakke_2_5", "dk_pakke_5_10", "dk_pakke_10_15", "dk_pakke_15_20"];

const LABEL_MAP: Record<string, string> = {
  dk_0_100: "Danmark 0-100g",
  dk_100_250: "Danmark 100-250g",
  udland_0_100: "Udland 0-100g",
  udland_100_250: "Udland 100-250g",
  dk_pakke_0_1: "Danmark 0-1 kg",
  dk_pakke_1_2: "Danmark 1-2 kg",
  dk_pakke_2_5: "Danmark 2-5 kg",
  dk_pakke_5_10: "Danmark 5-10 kg",
  dk_pakke_10_15: "Danmark 10-15 kg",
  dk_pakke_15_20: "Danmark 15-20 kg",
};

const TIERS = ["Lite", "Standard", "Plus"];

export function PostageOverviewTab() {
  const { t } = useTranslation();
  const now = new Date();
  const [from, setFrom] = useState<Date>(startOfMonth(now));
  const [to, setTo] = useState<Date>(endOfMonth(now));

  const { data: items, isLoading } = useQuery({
    queryKey: ["postage-overview", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("porto_option, tenant_id, tenants!inner(tenant_type_id, tenant_types!inner(name))")
        .not("porto_option", "is", null)
        .gte("received_at", from.toISOString())
        .lte("received_at", to.toISOString());
      if (error) throw error;
      return data as Array<{
        porto_option: string;
        tenant_id: string;
        tenants: { tenant_type_id: string; tenant_types: { name: string } };
      }>;
    },
  });

  const aggregated = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const allOptions = [...LETTER_OPTIONS, ...PACKAGE_OPTIONS];
    for (const opt of allOptions) {
      map[opt] = { Lite: 0, Standard: 0, Plus: 0 };
    }
    if (!items) return map;
    for (const item of items) {
      const opt = item.porto_option;
      const tier = item.tenants?.tenant_types?.name;
      if (!opt || !tier || !map[opt]) continue;
      if (map[opt][tier] !== undefined) {
        map[opt][tier]++;
      }
    }
    return map;
  }, [items]);

  const renderSection = (title: string, options: string[]) => {
    let totalCount = 0;
    let totalAmount = 0;
    const tierTotals: Record<string, number> = { Lite: 0, Standard: 0, Plus: 0 };

    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("postage.category", "Porto-type")}</TableHead>
                <TableHead>{t("postage.price", "Stk. pris")}</TableHead>
                {TIERS.map((tier) => (
                  <TableHead key={tier} className="text-right">{tier}</TableHead>
                ))}
                <TableHead className="text-right">{t("postage.totalCount", "Antal Total")}</TableHead>
                <TableHead className="text-right">{t("postage.totalAmount", "Beløb Total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((opt) => {
                const row = aggregated[opt] || { Lite: 0, Standard: 0, Plus: 0 };
                const rowTotal = TIERS.reduce((s, t) => s + (row[t] || 0), 0);
                const price = POSTAGE_PRICES[opt] || 0;
                const rowAmount = rowTotal * price;
                totalCount += rowTotal;
                totalAmount += rowAmount;
                TIERS.forEach((t) => (tierTotals[t] += row[t] || 0));

                return (
                  <TableRow key={opt}>
                    <TableCell className="font-medium">{LABEL_MAP[opt] || opt}</TableCell>
                    <TableCell>{price.toFixed(2).replace(".", ",")} kr.</TableCell>
                    {TIERS.map((tier) => (
                      <TableCell key={tier} className="text-right">{row[tier] || 0}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium">{rowTotal}</TableCell>
                    <TableCell className="text-right font-medium">{rowAmount.toFixed(2).replace(".", ",")} kr.</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">{t("postage.total", "Total")}</TableCell>
                <TableCell />
                {TIERS.map((tier) => (
                  <TableCell key={tier} className="text-right font-bold">{tierTotals[tier]}</TableCell>
                ))}
                <TableCell className="text-right font-bold">{totalCount}</TableCell>
                <TableCell className="text-right font-bold">{totalAmount.toFixed(2).replace(".", ",")} kr.</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap gap-4 items-end">
        <DatePicker label={t("postage.from", "Fra")} date={from} onSelect={setFrom} />
        <DatePicker label={t("postage.to", "Til")} date={to} onSelect={setTo} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          {renderSection(t("postage.letters", "Breve"), LETTER_OPTIONS)}
          {renderSection(t("postage.packages", "Pakker"), PACKAGE_OPTIONS)}
        </>
      )}
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "dd. MMM yyyy", { locale: da })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onSelect(d)}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
