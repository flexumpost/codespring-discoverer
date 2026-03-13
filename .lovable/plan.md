

## Plan: Tilføj dato/tid til statusvisning i operatør-dashboard

### Ændring i `src/pages/OperatorDashboard.tsx`

Opdater `getOperatorStatusDisplay` så alle handlinger viser hvornår de blev bestilt/registreret, baseret på `item.updated_at`:

1. **Destruer** — vis "Destrueres - bestilt [dato]" med `updated_at`
2. **Daglig / Lig på kontoret** — vis "Lig på kontoret - [dato]" med `updated_at`
3. **Scan (bestilt)** — brug `updated_at` i stedet for `now()` så tidspunktet viser hvornår scanningen faktisk blev bestilt
4. **Default-handlinger (ingen valgt action)** — tilføj modtagelsesdato fra `received_at`

Tilføj en hjælpefunktion `formatDanishDateTime(date)` der returnerer f.eks. "Mandag den 10. marts kl. 14:30".

Afhentning har allerede dato/tid fra pickup-notes — den forbliver uændret.

