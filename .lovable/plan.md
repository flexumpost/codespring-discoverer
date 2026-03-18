

## Plan: Arkiverede forsendelser skal være synlige og kunne genaktiveres

### Problem
Når en lejer arkiverer en forsendelse, forsvinder den fra operatør-dashboardet fordi query'en på linje 385 filtrerer arkiverede emner fra (undtagen destruer). Den skal i stedet vises med status "Arkiveret af bruger", og både lejer og operatør skal kunne genaktivere den.

### Ændringer

**1. Operatør-dashboard query** (`src/pages/OperatorDashboard.tsx`, linje 385)
- Udvid `.or()`-filteret til også at inkludere arkiverede emner (ikke kun `destruer`):
  - Fra: `status.in.(ny,afventer_handling,ulaest,laest,sendt_med_dao,sendt_med_postnord),and(status.eq.arkiveret,chosen_action.eq.destruer)`
  - Til: `status.in.(ny,afventer_handling,ulaest,laest,sendt_med_dao,sendt_med_postnord,arkiveret)`

**2. Status-visning på operatør-dashboardet** (`src/pages/OperatorDashboard.tsx`, `getStatusDisplay()`)
- Tilføj en case: når `status === "arkiveret"` og `chosen_action !== "destruer"`, vis "Arkiveret af bruger"

**3. Genaktivér-knap på operatør-dashboardet** (`src/components/OperatorMailItemDialog.tsx`)
- Når `item.status === "arkiveret"` og `chosen_action !== "destruer"`, vis en "Genaktivér"-knap der sætter status tilbage til `afventer_handling` og nulstiller `chosen_action`

**4. Genaktivér-knap på lejer-dashboardet** (`src/pages/TenantDashboard.tsx`)
- I arkiveret-visningen (når `activeFilter === "arkiveret"` eller i detail-dialogen), vis en "Genaktivér"-knap
- Opretter en `reactivateMutation` der sætter status til `afventer_handling` og nulstiller `chosen_action`
- Knappen vises i tabellens handlingskolonne og i detail-dialogen for arkiverede emner (undtagen destruerede)

**5. Farve for arkiverede emner** (`src/lib/mailRowColor.ts`)
- Flyt arkiveret-checket op i prioritetsrækkefølgen så det ikke overskrives af andre checks

### Ændrede filer
- `src/pages/OperatorDashboard.tsx`
- `src/components/OperatorMailItemDialog.tsx`
- `src/pages/TenantDashboard.tsx`
- `src/lib/mailRowColor.ts`

