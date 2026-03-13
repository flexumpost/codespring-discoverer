

## Fix: "Anden afhentningsdag" filtreres væk af allowedActions

### Problem
`getExtraActions()` returnerer korrekt `["scan", "send", "anden_afhentningsdag"]` for Plus/Standard/Lite når den aktuelle handling er "afhentning". Men på linje 638-640 filtreres listen med `allowedActions.includes(a)` — og `allowedActions` fra `tenant_types` indeholder `["scan", "send", "afhentning", "destruer"]`. Da `"anden_afhentningsdag"` ikke er i den liste, fjernes den.

### Løsning
`"anden_afhentningsdag"` er en UI-variant af `"afhentning"` (åbner kalenderen til at vælge en anden dag). Den skal behandles som tilladt, når `"afhentning"` er i `allowedActions`.

### Ændring i `src/pages/TenantDashboard.tsx`

**Linje 638-640** — tilføj mapping så `anden_afhentningsdag` accepteres hvis `afhentning` er tilladt:

```typescript
const availableExtras = extraActions.filter(
  (a) => allowedActions.includes(a) || (a === "anden_afhentningsdag" && allowedActions.includes("afhentning"))
);
```

Én linje ændret, ingen andre filer berørt.

