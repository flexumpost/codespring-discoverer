

## Fix: Pakke-dato og operatør-gebyr/status for Lite-pakker

### Problemer identificeret

1. **TenantDashboard — forkert dato for `standard_forsendelse` pakker (linje 318-321)**
   `getFirstThursdayOfMonth()` bruges for alle `standard_forsendelse`-forsendelser — men Lite-pakker skal bruge `getNextThursday()` (ugentlig). Første torsdag i marts (5. marts) er passeret, så funktionen returnerer 2. april i stedet for 19. marts.

2. **OperatorDashboard — forkert status for `standard_forsendelse` (linje 105-107)**
   Hardcoder `getShippingDate("Lite", "brev")` — ignorerer den faktiske `mail_type`. For pakker skal den bruge `getNextThursday()`.

3. **OperatorDashboard — forkert gebyr for `standard_forsendelse` pakker (linje 273)**
   Returnerer altid `"0 kr. + porto"` — men Lite-pakker koster `"50 kr. + porto"`.

### Ændringer

**`src/pages/TenantDashboard.tsx`** — linje 318-321:
```typescript
if (item.chosen_action === "standard_forsendelse") {
  if (item.mail_type === "pakke") {
    const nextDate = getNextThursday();
    return ["Sendes senest", formatDanishDate(nextDate)];
  }
  const nextDate = getFirstThursdayOfMonth();
  return ["Sendes", formatDanishDate(nextDate)];
}
```

**`src/pages/OperatorDashboard.tsx`** — linje 105-108 (status):
```typescript
if (action === "standard_forsendelse") {
  const tenantType = item.tenants?.tenant_types?.name;
  if (item.mail_type === "pakke") {
    const shipDate = getNextThursday();
    return `Skal sendes senest ${formatDanishDate(shipDate)}`;
  }
  const shipDate = getShippingDate(tenantType ?? "Lite", "brev");
  return `Skal sendes ${formatDanishDate(shipDate)}`;
}
```

**`src/pages/OperatorDashboard.tsx`** — linje 273 (gebyr):
```typescript
if (item.chosen_action === "standard_forsendelse") {
  if (item.mail_type === "pakke") return "50 kr. + porto";
  return "0 kr. + porto";
}
```

