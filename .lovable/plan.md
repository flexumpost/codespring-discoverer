

## Persist valgt virksomhed på tværs af sider

### Problem
Hver side (Dashboard, Forsendelsesadresse, Indstillinger) kalder `useTenants()` uafhængigt, som opretter sin egen `useState` for `selectedTenantId`. Når brugeren navigerer, nulstilles valget til den første virksomhed.

### Løsning
Flyt `selectedTenantId` state fra `useTenants` hook'en til en React Context, så den deles på tværs af alle sider.

### Ændringer

**`src/hooks/useTenants.tsx`**
- Opret en `TenantProvider` context der holder `selectedTenantId` state
- Eksportér en `TenantProvider` komponent og opdater `useTenants` til at læse/skrive fra context i stedet for lokal state
- Tenants-data forbliver i react-query (uændret)

**`src/App.tsx`**
- Wrap `AppRoutes` med `TenantProvider` (inden for `AuthProvider`)

**Ingen ændringer i siderne** — de bruger allerede `useTenants()` og vil automatisk dele state via context.

