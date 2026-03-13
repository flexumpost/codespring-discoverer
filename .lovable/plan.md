

## Plan: Dansk kalender med mandag som ugestart

### Ændring i `src/components/ui/calendar.tsx`

Tilføj `da` locale fra `date-fns/locale` og sæt `weekStartsOn: 1` (mandag) som standard-props på `DayPicker`. Dette påvirker alle steder kalenderen bruges (TenantDashboard, ShippingPrepPage).

- Import `da` fra `date-fns/locale`
- Tilføj `locale={da}` og `weekStartsOn={1}` som default props på `DayPicker`-komponenten
- `da`-locale sørger automatisk for danske dagnavne (ma, ti, on, to, fr, lø, sø)

Én fil ændres: `src/components/ui/calendar.tsx`.

