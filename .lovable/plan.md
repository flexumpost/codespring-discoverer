

## Plan: Opdater Standard brev-flow til at matche Plus-logik

### Problem
Standard-lejeres breve bruger i dag en simpel filtrering af ekstra-handlinger (fjern den aktuelle handling fra listen). Der mangler kontekst-afhængige handlingsvalg og "Anden afhentningsdag"-muligheden.

### Ændring
Én ændring i `getExtraActions()` i `src/pages/TenantDashboard.tsx` (linje 57-60):

Erstat den nuværende Standard-case med samme logik som Plus:

```typescript
if (tenantTypeName === "Standard") {
  switch (currentAction) {
    case "afhentning": return ["scan", "send", "anden_afhentningsdag"];
    case "scan":       return ["send", "afhentning"];
    case "send":       return ["scan", "afhentning"];
    default:           return ["scan", "afhentning", "send"];
  }
}
```

### Hvad dette giver

| Effektiv handling | Status | Ekstra handlinger |
|---|---|---|
| Afhentning | Afhentes [næste torsdag] | Åben og scan, Send, Anden afhentningsdag |
| Scanning | Scannes inden for 24 timer | Send, Afhentning |
| Forsendelse | Sendes [næste torsdag] | Åben og scan, Afhentning |

### Statusvisning
`getStatusDisplay()` håndterer allerede alle tre scenarier korrekt — ingen ændringer nødvendige der.

### Fil der ændres
- `src/pages/TenantDashboard.tsx` — kun `getExtraActions()` funktionen

