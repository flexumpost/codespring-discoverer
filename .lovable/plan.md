

## Tilføj "Gratis afhentning" for Lite breve

### Problem
Lite-lejere mangler muligheden "Gratis afhentning" (0 kr.) for breve. Denne handling svarer til afhentning på første torsdag i måneden — gratis.

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Ny action-nøgle: `gratis_afhentning`**
Tilføj til `ACTION_LABELS`: `gratis_afhentning: "Gratis afhentning"`

**2. Tilføj til Lite brev-handlinger (linje 83-90)**
Tilføj `gratis_afhentning` til alle Lite breve switch-cases, så den altid er tilgængelig.

**3. Label (linje 97-102)**
Lite-specifikt label: `gratis_afhentning` → "Gratis afhentning"

**4. Pris (linje 222-228)**
Tilføj: `if (action === "gratis_afhentning") return "0 kr.";` i Lite-blokken.

**5. Status-tekst**
Når `gratis_afhentning` er valgt, vis "Afhentes [første torsdag i måneden]" i status-kolonnen — brug den eksisterende `getFirstThursdayOfMonth()` + `formatDanishDate()`.

**6. Gebyr-kolonnen**
Sørg for at gebyr viser "0 kr." når `gratis_afhentning` er den aktive handling.

### Hvad ændres IKKE
- Øvrige handlinger og priser forbliver uændret
- Operatør-dashboard og forsendelseslogik uændret

