

## Problem

`getNextThursday()` er implementeret forskelligt i de to dashboards:

- **TenantDashboard** (korrekt): Hvis i dag er torsdag, returnerer **næste** torsdag (26. marts)
- **OperatorDashboard** (forkert): Hvis i dag er torsdag, returnerer **i dag** (19. marts)

Forskellen er i linjen der beregner dage til næste torsdag. Tenant-versionen bruger `|| 7` som sikrer at torsdage aldrig returnerer 0 dage fremad.

## Løsning

**Fil: `src/pages/OperatorDashboard.tsx`** (linje 57-63)

Ret `getNextThursday()` så den matcher tenant-versionen — hvis i dag er torsdag, returner næste torsdag:

```typescript
function getNextThursday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntil = (4 - dayOfWeek + 7) % 7 || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil);
}
```

Én linje ændres: tilføj `|| 7` og fjern special-casen for `dayOfWeek === 4`.

