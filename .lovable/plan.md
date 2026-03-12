

## Ændringer i `src/pages/TenantDashboard.tsx`

### 1. Omdøb "Ekstra forsendelse" til "Forsendelse"

- Linje 36: `ACTION_LABELS.send` ændres fra `"Ekstra forsendelse"` til `"Forsendelse"`
- Linje 163: Status-teksten ændres fra `"Ekstra forsendelse"` til `"Forsendelse"`

### 2. Fjern låsning når lejer selv har valgt "send"

Linje 561: Lås kun når handlingen er standardens "send" (dvs. `item.chosen_action` er `null` og default er "send"). Hvis lejeren eksplicit har valgt "send" via dropdown (`item.chosen_action === "send"`), skal brevet **ikke** låses — lejeren skal kunne ændre handling indtil operatøren markerer det som sendt.

```typescript
const isLockedForShipping = !item.chosen_action && effectiveAction === "send" && today >= packingDay;
```

Logik: Kun breve der kører på standard-forsendelse låses dagen før. Breve hvor lejeren aktivt har valgt forsendelse forbliver redigerbare.

