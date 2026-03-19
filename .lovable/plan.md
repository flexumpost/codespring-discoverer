

## Problem

For Plus-pakker vises "Afhentning" og "Anden afhentningsdag" samtidig i dropdown. "Anden afhentningsdag" skal kun tilbydes når den nuværende handling allerede er "afhentning" (dvs. standard-handlingen er afhentning og datoen er sat til førstkommende torsdag). Når brugeren ser "Anden afhentningsdag" skal "Afhentning" ikke vises, da den allerede er aktiv.

## Plan

**Fil: `src/pages/TenantDashboard.tsx`** (linje 57-61)

Ændr pakke-logikken for Plus-lejere:
- Når `currentAction === "afhentning"`: vis `["anden_afhentningsdag", "standard_forsendelse"]`
- Ellers (fx `standard_forsendelse` eller andet): vis `["afhentning", "standard_forsendelse"]` (uden "anden_afhentningsdag")

```typescript
if (mailType === "pakke") {
  if (tenantTypeName === "Plus" && currentAction === "afhentning") {
    return addDestruer(["anden_afhentningsdag", "standard_forsendelse"]);
  }
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

Dette sikrer at "Anden afhentningsdag" kun vises som alternativ til den allerede valgte afhentning, og aldrig sammen med "Afhentning".

