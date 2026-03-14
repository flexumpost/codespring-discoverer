

## Fix: Vis "Standard scanning" når "Scan nu" er valgt

### Problem
I `getExtraActions` for Lite (linje 71) mangler `standard_scan` i listen når `currentAction === "scan"`. Lejeren kan derfor ikke skifte fra den betalte scanning til den gratis standard scanning.

### Ændring

**`src/pages/TenantDashboard.tsx` — linje 71**

Ændr:
```typescript
case "scan": return ["send", "standard_forsendelse", "afhentning"];
```
Til:
```typescript
case "scan": return ["standard_scan", "send", "standard_forsendelse", "afhentning"];
```

Dette tilføjer `standard_scan` som valgmulighed når lejeren allerede har valgt "Scan nu", så de kan skifte til den gebyrfrie scanning.

