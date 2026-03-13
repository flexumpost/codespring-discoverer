

## Plan: Tilføj "Send hurtigst muligt" til Lite forsendelse-flow

### Problem
Når en Lite-lejer har standardhandling "send" (Forsendelse), returnerer `getExtraActions` kun `["scan", "afhentning"]`. Der mangler muligheden "Send hurtigst muligt" som skal sende brevet den førstkommende torsdag i stedet for den månedlige kadence.

### Ændring

**Fil:** `src/pages/TenantDashboard.tsx`, linje 69

Ret fra:
```typescript
case "send":       return ["scan", "afhentning"];
```
Til:
```typescript
case "send":       return ["scan", "send", "afhentning"];
```

Når `send` indgår som ekstra handling for Lite, vises den med labelen "Send hurtigst muligt" (via den eksisterende `getActionLabel`-funktion), og status ændres til "Sendes [næste torsdag]" — som allerede håndteres korrekt i `getStatusDisplay`.

Bemærk: `send` som ekstra handling filtreres **ikke** ud, fordi den repræsenterer en hurtigere forsendelse end standard-`send` (månedlig → ugentlig).

