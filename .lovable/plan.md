

## Fix: Tilføj "Standard forsendelse" som mulighed for Lite-pakker

### Problem
Linje 55: Lite-pakker har kun `["afhentning"]` som ekstra handlinger. Når lejeren har valgt "Afhentning", kan de ikke skifte til "Standard forsendelse".

### Ændring i `src/pages/TenantDashboard.tsx` — linje 54-56

Fra:
```typescript
if (tenantTypeName === "Lite") {
  return addDestruer(["afhentning"].filter(a => a !== currentAction));
}
```

Til:
```typescript
if (tenantTypeName === "Lite") {
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

Dette giver Lite-pakkelejere mulighed for at skifte mellem "Afhentning" og "Standard forsendelse".

