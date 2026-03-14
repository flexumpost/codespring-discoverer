

## Pakke-håndtering for Standard og Plus: Samme logik som Lite, andre gebyrer

### Ændringer

**1. `src/pages/TenantDashboard.tsx` — `getExtraActions` (linje 57)**

Nuværende Standard/Plus pakke-logik (`["send", "afhentning"]`) erstattes med samme mønster som Lite (`["afhentning", "standard_forsendelse"]`):

```typescript
// Linje 53-57: Alle pakker bruger nu samme handlingsmuligheder
if (mailType === "pakke") {
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

**2. `src/pages/TenantDashboard.tsx` — `getItemFee` (efter linje 154)**

Tilføj pakke-specifik gebyrlogik for Standard og Plus før den generelle logik:

```typescript
if (mailType === "pakke" && tenantTypeName === "Standard") {
  if (chosenAction === "destruer" || ...) return "0 kr.";
  if (chosenAction === "send" || chosenAction === "standard_forsendelse") return "30 kr. + porto";
  if (chosenAction === "afhentning") return "30 kr.";
  return "30 kr. + porto";
}
if (mailType === "pakke" && tenantTypeName === "Plus") {
  if (chosenAction === "destruer" || ...) return "0 kr.";
  if (chosenAction === "send" || chosenAction === "standard_forsendelse") return "10 kr. + porto";
  if (chosenAction === "afhentning") return "10 kr.";
  return "10 kr. + porto";
}
```

**3. `src/pages/TenantDashboard.tsx` — `getActionPrice` (linje 196-200)**

Udvid pakke-blokken til at dække Standard og Plus:

```typescript
if (mailType === "pakke") {
  if (action === "destruer") return "0 kr.";
  if (tenantTypeName === "Lite") { ... "50 kr." ... }
  if (tenantTypeName === "Standard") { ... "30 kr." / "30 kr. + porto" ... }
  if (tenantTypeName === "Plus") { ... "10 kr." / "10 kr. + porto" ... }
}
```

**4. `src/pages/OperatorDashboard.tsx` — `getItemFee` (linje 278-281)**

Opdater `standard_forsendelse` pakke-gebyr til at bruge tier:

```typescript
if (item.chosen_action === "standard_forsendelse") {
  if (item.mail_type === "pakke") {
    const tier = item.tenants?.tenant_types?.name;
    if (tier === "Plus") return "10 kr. + porto";
    if (tier === "Standard") return "30 kr. + porto";
    return "50 kr. + porto"; // Lite
  }
  return "0 kr. + porto";
}
```

Og tilsvarende for `afhentning` af pakker (linje 286-290).

### Filer
- `src/pages/TenantDashboard.tsx`
- `src/pages/OperatorDashboard.tsx`

