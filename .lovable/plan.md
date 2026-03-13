

## Plan: Tilføj "Annuller handling" kolonne

### Ændring i `src/pages/TenantDashboard.tsx`

**1. Import** — Tilføj `Undo2` ikon fra lucide-react.

**2. Tabel-header** (linje 546-547) — Indsæt `<TableHead>Annuller handling</TableHead>` efter "Vælg handling".

**3. Tabel-body** — Indsæt ny `<TableCell>` efter "Vælg handling"-cellen (efter linje 661). Indholdet:
- Hvis `item.chosen_action` er sat → vis en `Button` med `Undo2`-ikon der nulstiller `chosen_action` til `null` og `notes` til `null`, og sætter status tilbage til `ny`.
- Hvis ingen ekstra handling er valgt → vis ingenting.

**4. Ny mutation** — `cancelAction`: opdaterer mail_item med `{ chosen_action: null, notes: null, status: "ny" }` og invaliderer queries.

### Fil der ændres
- `src/pages/TenantDashboard.tsx`

