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
import { POSTAGE_PRICES } from "@/lib/porto";
import { lettersPortoIncluded } from "@/lib/tiers";

const SENT_STATUSES = ["sendt_med_dao", "sendt_med_postnord"];

interface ConsumptionRow {
  tenantId: string;
  companyName: string;
  tierName: string;
  letters: number;
  packages: number;
  paidByTenant: number;
  paidByUs: number;
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} kr.`;

export function ConsumptionTab() {
  const { t } = useTranslation();
  const now = new Date();
  const [from, setFrom] = useState<Date>(startOfMonth(now));
  const [to, setTo] = useState<Date>(endOfMonth(now));

  const { data: items, isLoading } = useQuery({
    queryKey: ["consumption-per-tenant", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("porto_option, mail_type, tenant_id, tenants!inner(company_name, tenant_types!inner(name))")
        .in("status", SENT_STATUSES)
        .not("porto_option", "is", null)
        .gte("received_at", from.toISOString())
        .lte("received_at", to.toISOString());
      if (error) throw error;
      return data as Array<{
        porto_option: string;
        mail_type: string;
        tenant_id: string;
        tenants: { company_name: string; tenant_types: { name: string } };
      }>;
    },
  });

  const rows = useMemo<ConsumptionRow[]>(() => {
    const map = new Map<string, ConsumptionRow>();
    for (const item of items ?? []) {
      const price = POSTAGE_PRICES[item.porto_option] ?? 0;
      const tierName = item.tenants?.tenant_types?.name ?? "";
      const isPackage = item.mail_type === "pakke";
      // Pakker betaler lejeren altid selv; breve er gratis for løsninger med porto inkluderet.
      const paidByUs = !isPackage && lettersPortoIncluded(tierName);

      let row = map.get(item.tenant_id);
      if (!row) {
        row = {
          tenantId: item.tenant_id,
          companyName: item.tenants?.company_name ?? t("consumption.unknownTenant", "Ukendt lejer"),
          tierName,
          letters: 0,
          packages: 0,
          paidByTenant: 0,
          paidByUs: 0,
        };
        map.set(item.tenant_id, row);
      }
      if (isPackage) row.packages++; else row.letters++;
      if (paidByUs) row.paidByUs += price; else row.paidByTenant += price;
    }
    return [...map.values()].sort((a, b) => b.paidByUs - a.paidByUs);
  }, [items, t]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          letters: acc.letters + r.letters,
          packages: acc.packages + r.packages,
          paidByTenant: acc.paidByTenant + r.paidByTenant,
          paidByUs: acc.paidByUs + r.paidByUs,
        }),
        { letters: 0, packages: 0, paidByTenant: 0, paidByUs: 0 }
      ),
    [rows]
  );

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap gap-4 items-end">
        <DatePicker label={t("postage.from", "Fra")} date={from} onSelect={setFrom} />
        <DatePicker label={t("postage.to", "Til")} date={to} onSelect={setTo} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">{t("consumption.empty", "Ingen sendte forsendelser i perioden.")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("consumption.tenant", "Lejer")}</TableHead>
                <TableHead>{t("consumption.tier", "Løsning")}</TableHead>
                <TableHead className="text-right">{t("consumption.letters", "Breve")}</TableHead>
                <TableHead className="text-right">{t("consumption.packages", "Pakker")}</TableHead>
                <TableHead className="text-right">{t("consumption.paidByTenant", "Betalt af lejer")}</TableHead>
                <TableHead className="text-right">{t("consumption.paidByUs", "Betalt af os")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.tenantId}>
                  <TableCell className="font-medium">{r.companyName}</TableCell>
                  <TableCell>{r.tierName}</TableCell>
                  <TableCell className="text-right">{r.letters}</TableCell>
                  <TableCell className="text-right">{r.packages}</TableCell>
                  <TableCell className="text-right">{fmt(r.paidByTenant)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(r.paidByUs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">{t("postage.total", "Total")}</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{totals.letters}</TableCell>
                <TableCell className="text-right font-bold">{totals.packages}</TableCell>
                <TableCell className="text-right font-bold">{fmt(totals.paidByTenant)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(totals.paidByUs)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {t(
          "consumption.note",
          "Kun forsendelser hvor vægten er valgt, er med. Beløb er ekskl. moms. Pakker betales altid af lejeren."
        )}
      </p>
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
