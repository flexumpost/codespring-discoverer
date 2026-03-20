

## Tilføj "Ubetalt faktura" funktionalitet

### Oversigt
Tilføj en `has_unpaid_invoice` boolean-kolonne til `tenants`-tabellen. Operatører kan markere lejere med ubetalte fakturaer via en checkbox i lejeroversigten. Når markeret, blokeres lejerens forsendelsesbehandling og en advarsel vises.

### Ændringer

**1. Database-migration**
- Tilføj kolonne `has_unpaid_invoice boolean NOT NULL DEFAULT false` til `tenants`.

**2. `src/pages/TenantsPage.tsx`**
- Tilføj kolonne "Ubetalt faktura" med en checkbox i tabellen (mellem "Velkomst e-mail" og "Nye breve").
- Checkbox opdaterer `tenants.has_unpaid_invoice` direkte via `supabase.update()`.
- `onClick` stopPropagation så rækken ikke navigerer.

**3. `src/pages/TenantDashboard.tsx`**
- Tjek `selectedTenant?.has_unpaid_invoice`.
- Hvis `true`: vis et `Alert`-kort (destructive) øverst med teksten:
  > **Ubetalt faktura — forsendelser bliver ikke behandlet**
  > Så snart udestående faktura er betalt, bliver behandlingen genoptaget.
- Dæmp alle forsendelsesrækker med `opacity-50 pointer-events-none` og fjern `cursor-pointer`.
- Deaktiver handlingsvælgere (select dropdowns).

**4. `src/pages/OperatorDashboard.tsx`**
- Vis en lille "Ubetalt faktura"-badge ved lejernavnet på forsendelseslinjer hvor `item.tenants?.has_unpaid_invoice === true`.
- Operatøren kan stadig håndtere forsendelserne normalt.

**5. Forsendelsesdato-logik ved genaktivering**
- Når `has_unpaid_invoice` sættes til `false`, kald en database-funktion `recalculate_shipping_dates` som finder forsendelser med overskredet forsendelsesdato og opdaterer `pickup_date` til næste forsendelsesdag.
- Alternativt håndteres dette client-side: ved unchecking af checkbox i TenantsPage, kald en mutation der finder alle aktive forsendelser for lejeren med `chosen_action` i (`send`, `standard_forsendelse`) og `pickup_date < now()`, og opdaterer `pickup_date` til næste torsdag.

### Tekniske detaljer
- Kolonne: `has_unpaid_invoice boolean NOT NULL DEFAULT false` — ingen eksisterende data påvirkes.
- RLS: Eksisterende "Operators update tenants"-policy dækker allerede opdateringen.
- Forsendelsesdato-genberegning: Bruger `getNextThursday()`-logikken der allerede findes i TenantDashboard, men implementeret som en simpel SQL-update der sætter `pickup_date` til næste torsdag for forsendelser med overskredet dato.

