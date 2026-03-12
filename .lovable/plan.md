

## Problem

`getStatusDisplay` ignorerer lejerens `default_mail_action`/`default_package_action` når `chosen_action` er `null`. Den viser altid "Sendes på næste forsendelsesdag" for Lite/Standard/Plus, uanset om standarden faktisk er afhentning eller scanning.

## Ændringer i `src/pages/TenantDashboard.tsx`

### 1. Udvid `getStatusDisplay` signaturen

Tilføj `defaultMailAction` og `defaultPackageAction` parametre.

### 2. Erstat "No action chosen"-blokken (linje 173-181)

Når `chosen_action` er `null`, beregn `effectiveAction` fra lejerens standard:

```typescript
// No action chosen → use tenant default
const effectiveAction = item.mail_type === "pakke"
  ? defaultPackageAction
  : defaultMailAction;

if (effectiveAction === "send" || (!effectiveAction && ["Lite", "Standard", "Plus"].includes(tenantTypeName ?? ""))) {
  const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
  return ["Sendes på næste forsendelsesdag", formatDanishDate(nextDate)];
}
if (effectiveAction === "afhentning") {
  const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
  return ["Kan afhentes", formatDanishDate(nextDate)];
}
if (effectiveAction === "scan") {
  const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
  return ["Brevet scannes", formatDanishDate(nextDate)];
}
if (effectiveAction === "daglig" || tenantTypeName === "Fastlejer") {
  return ["Lægges på kontoret"];
}
if (effectiveAction === "destruer") {
  return ["Destrueres"];
}
return [STATUS_LABELS[item.status as MailStatus] ?? item.status];
```

### 3. Opdater kald (linje ~520 og ~670)

Ændr begge kald til:
```typescript
getStatusDisplay(item, tenantTypeName, selectedTenant?.default_mail_action, selectedTenant?.default_package_action)
```

`selectedTenant` er allerede tilgængelig fra `useTenants()` hooket (linje 203).

