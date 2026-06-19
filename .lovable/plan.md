## Problem

I `BulkUploadPage.tsx` navigeres brugeren til `/mail` efter succesfuld gemning (samt ved klik på tilbage-pilen), men denne rute findes ikke i `App.tsx`. Routes der findes: `/`, `/bulk-upload`, `/notifications`, `/shipping-address`, `/settings`, `/shipping-prep`, `/tenants`, `/tenants/:id`, `/tenants/:id/dashboard`, `/set-password`. Alle ukendte stier rammer `NotFound` → 404.

Konkrete steder i `src/pages/BulkUploadPage.tsx`:
- Linje ~232: `navigate("/mail")` efter succesfuld bulk save
- Linje ~256: tilbage-pil `onClick={() => navigate("/mail")}`
- Også `queryClient.invalidateQueries({ queryKey: ["mail-items"] })` — operator-dashboardet bruger formentlig en anden query key

## Løsning

1. Ret begge `navigate("/mail")` til `navigate("/")` (operator-dashboardet er forsiden for operatører).
2. Verificer query key brugt i `OperatorDashboard.tsx` og opdater `invalidateQueries`-kaldet så den nyligt uploadede post faktisk dukker op uden manuel refresh.

Ingen andre ændringer — kun frontend-navigation/cache-invalidation fix.

## Filer

- `src/pages/BulkUploadPage.tsx` (navigation + invalidate key)
