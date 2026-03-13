

## Plan: Tilføj "Gebyr" kolonne til operatør-dashboard

### Logik
En handling er "ekstra" når `chosen_action` afviger fra lejerens standardhandling (`default_mail_action` / `default_package_action`). Gebyret hentes fra pricing_settings baseret på lejerens tier (Lite/Standard/Plus) og den valgte handling.

**Gebyr-mapping for breve:**
- Ekstra scan → `ekstraScanning` (f.eks. "50 kr.")
- Ekstra forsendelse → `ekstraForsendelse`
- Ekstra afhentning → `ekstraAfhentning`

**For pakker:** altid `haandteringsgebyr` fra pakke-priser.

Hvis handlingen matcher standardhandlingen, eller ingen handling er valgt → "-".

### Ændringer i `src/pages/OperatorDashboard.tsx`

1. **Udvid query** — tilføj `tenant_types(name)` via `tenants`-joinet:
   ```
   tenants(company_name, default_mail_action, default_package_action, tenant_types(name))
   ```

2. **Hent pricing_settings** — tilføj et ekstra `useEffect` eller state der loader pricing data fra `pricing_settings` tabellen (med fallback til `MAIL_PRICING_DEFAULTS` og `PACKAGE_PRICING_DEFAULTS` fra PricingOverview).

3. **Ny funktion `getItemFee(item, pricing)`** — returnerer gebyr-tekst:
   - Bestem om det er brev eller pakke
   - Find lejerens tier fra `item.tenants.tenant_types.name`
   - Sammenlign `chosen_action` med default action
   - Hvis ekstra → slå op i pricing data → returner pris-tekst (f.eks. "50 kr.")
   - Ellers → "-"

4. **Tilføj kolonne** — efter `<TableHead>Status</TableHead>`, indsæt `<TableHead>Gebyr</TableHead>` og tilsvarende `<TableCell>` med fee-visning.

### Filer der ændres
- `src/pages/OperatorDashboard.tsx`

