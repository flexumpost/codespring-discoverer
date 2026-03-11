

## Problem

Forsendelse nr. 2800 er et Lite-brev med standardhandling sat til "Forsendelse". Koden filtrerer bevidst standardhandlingen ud fra ekstra-handlinger (linje 562):

```typescript
const availableExtras = extraActions.filter(
  (a) => a !== defaultAction && allowedActions.includes(a)
);
```

Da `defaultAction` er `"send"`, fjernes "Ekstra forsendelse" fra dropdown-listen.

## Løsning

Fjern filtreringen af standardhandlingen fra `availableExtras`. Alle ekstra handlinger skal altid vises uanset hvad standardhandlingen er.

**`src/pages/TenantDashboard.tsx`**, linje 561-563:

```typescript
// Før:
const availableExtras = extraActions.filter(
  (a) => a !== defaultAction && allowedActions.includes(a)
);

// Efter:
const availableExtras = extraActions.filter(
  (a) => allowedActions.includes(a)
);
```

Dette er en enkelt linje-ændring. Alle tre ekstra handlinger (Åben og scan, Afhentning, Ekstra forsendelse) vil nu vises for Lite-breve uanset standardhandling.

