

## Fix: Operatør status for standard-forsendelser

### Problem
Når en lejer har standardhandling "Forsendelse" og ikke har valgt en eksplicit handling, viser operatør-dashboardet: `Forsendelse - modtaget 12. marts kl. 11:49`. Det korrekte er: `Skal sendes torsdag den 2. april`.

"Modtaget"-tidspunktet er kun relevant for scan-handlinger (24-timers frist).

### Ændring i `src/pages/OperatorDashboard.tsx`

Opdater `getOperatorStatusDisplay` funktionens fallback-logik (linje 93-101). Når der ikke er valgt en handling og standardhandlingen bruges, skal status-teksten matche den samme logik som ved eksplicit valgt handling:

- **send** → `Skal sendes [næste torsdag]`
- **afhentning** → `Afhentning (standard)`
- **scan** → `Scanning bestilt - modtaget [dato/tid]` (her er modtaget-tid relevant)
- **destruer** → `Destrueres (standard)`
- **daglig** → `Lig på kontoret (standard)`

Kun for `scan` beholdes modtaget-tidspunktet, da det er relevant for 24-timers fristen.

### Fil
`src/pages/OperatorDashboard.tsx` — linje 93-101

