

## Plan: Debug og fiks blank skærm for lejer-login

### Analyse
Konsol-loggen viser kun operator-sessionen (fordi du er logget ind som operatør nu). Fejlen der forårsager den blanke skærm på lejer-kontoen er ikke synlig herfra. Det mest sandsynlige er en runtime-fejl i TenantDashboard.tsx efter de seneste ændringer (overrideTenantId-prop, reactivateMutation, Beta badge).

### Mulige årsager (prioriteret)

1. **React Error Boundary mangler** — en crash i TenantDashboard giver hvid skærm uden fejlbesked i UI
2. **Subtil type-fejl** i de nye conditional expressions (linje 442-444) der kan give `undefined` runtime errors

### Plan

**1. Tilføj React Error Boundary** (`src/components/ErrorBoundary.tsx` — ny fil)
- Fanger runtime-fejl og viser en fejlbesked i stedet for blank skærm
- Wrap TenantDashboard i Index.tsx med ErrorBoundary

**2. Sikkerheds-fix i TenantDashboard.tsx**
- Tilføj null-guards omkring de nye reactivate-knapper og overrideTenantId-logikken
- Sørg for at `selectedTenant` og `tenantTypeName` altid er safe at tilgå

**3. Bed dig logge ind som lejer i preview** for at se den faktiske fejlbesked i konsollen

### Ændrede filer
- `src/components/ErrorBoundary.tsx` — ny fil
- `src/pages/Index.tsx` — wrap med ErrorBoundary
- `src/pages/TenantDashboard.tsx` — tilføj defensive null-guards

