

## Lite-pakker: Ugentlig forsendelse, ingen hurtig option

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. `getNextShippingDate` (linje 267-272)**
Lite-pakker skal nu bruge `getNextThursday()` i stedet for `getFirstThursdayOfMonth()`:
```typescript
if (tenantType === "Lite") {
  if (mailType === "pakke") return getNextThursday();
  return getFirstThursdayOfMonth();
}
```

**2. `getExtraActions` (linje 53-56)**
Fjern `"send"` og `"standard_forsendelse"` fra Lite-pakkers ekstra-handlinger — kun afhentning og destruer er mulige:
```typescript
if (mailType === "pakke" && tenantTypeName === "Lite") {
  return addDestruer(["afhentning"].filter(a => a !== currentAction));
}
```

**3. Status-tekst** — "Sendes senest [dato]" forbliver, da pakker stadig kan sendes før torsdagen.

### Fil
- **Ændret**: `src/pages/TenantDashboard.tsx`

