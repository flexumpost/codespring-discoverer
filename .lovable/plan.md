

## Rettelse: Forsendelse af pakker for Lite skal vise "50 kr. + porto"

### Problem
Fallback-linjerne i `getItemFee` (linje 153) og `getActionPrice` (linje 199) viser "50 kr." i stedet for "50 kr. + porto" for Lite-pakker.

### Ændringer i `src/pages/TenantDashboard.tsx`

**`getItemFee`** — linje 153:
```
return "50 kr.";  →  return "50 kr. + porto";
```

**`getActionPrice`** — linje 199:
```
return "50 kr.";  →  return "50 kr. + porto";
```

Disse to fallbacks er de eneste steder, hvor forsendelse af Lite-pakker mangler "+ porto".

