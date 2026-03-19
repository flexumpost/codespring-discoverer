

## Problem

1. **Pakker mangler "Anden afhentningsdag"**: For pakker returnerer `getExtraActions` kun `["afhentning", "standard_forsendelse"]` — uanset lejertype. Plus-lejere kan ikke vælge en anden afhentningsdag med kalender/tidspunkt.

2. **Forkert gebyr for Plus-pakker ved forsendelse**: `getActionPrice` og `getItemFee` viser `"10 kr. + porto"` for Plus-pakkers forsendelse. Plus-lejere har gratis porto, så det skal vise `"10 kr. - Gratis porto"`.

## Plan

**Fil: `src/pages/TenantDashboard.tsx`**

### Ændring 1: Tilføj "anden_afhentningsdag" for Plus-pakker

I `getExtraActions` (linje 57-59) — når `mailType === "pakke"`, tilføj `"anden_afhentningsdag"` til listen for Plus-lejere, så de kan vælge en alternativ afhentningsdag med kalendervalg:

```
if (mailType === "pakke") {
  const actions = ["afhentning", "standard_forsendelse"];
  if (tenantTypeName === "Plus") actions.push("anden_afhentningsdag");
  return addDestruer(actions.filter(a => a !== currentAction));
}
```

### Ændring 2: Ret gebyrvisning for Plus-pakker

I `getActionPrice` (linje 199-209) og `getItemFee` (linje 144-156) — for Plus-lejere skal forsendelsesgebyret ændres fra `"10 kr. + porto"` til `"10 kr. - Gratis porto"`:

- Ændr `Plus.feePorto` fra `"10 kr. + porto"` til `"10 kr. - Gratis porto"` begge steder
- Tilføj pris for `anden_afhentningsdag` for Plus-pakker: `"10 kr."`

### Filer der ændres
- `src/pages/TenantDashboard.tsx`

