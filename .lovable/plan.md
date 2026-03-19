

## Fix: Standard brev — standard scanning skal vise næste torsdag, ikke "inden for 24 timer"

### Problem
Når Standard-lejers standardhandling for breve er "Scanning", vises status som "Scannes inden for 24 timer". Det er forkert — standard scanning for Standard-lejere skal scannes den efterfølgende torsdag. "Scan nu" (30 kr.) er den handling, der scanner inden for 24 timer.

### Ændringer

**1. `src/pages/TenantDashboard.tsx` — `getStatusDisplay` (linje 424-430)**

Tilføj Standard-lejer til den eksisterende Lite-check, så default `scan` for Standard viser næste torsdag:

```typescript
if (effectiveAction === "scan") {
  if (tenantTypeName === "Lite" && !item.chosen_action) {
    const nextDate = getFirstThursdayOfMonth();
    return ["Scannes gratis den første torsdag i måneden", formatDanishDate(nextDate)];
  }
  if (tenantTypeName === "Standard" && !item.chosen_action) {
    const nextDate = getNextThursday();
    return ["Standard scanning", formatDanishDate(nextDate)];
  }
  return ["Afventer scanning", "Scannes inden for 24 timer"];
}
```

**2. Remap-logik (linje ~1031-1044)** — tilføj remap for Standard brev med default `scan`:

```typescript
if (!item.chosen_action && tenantTypeName === "Standard" && item.mail_type !== "pakke" && effectiveAction === "scan") {
  actionForExtras = "standard_scan";
}
```

Dette sikrer at dropdown'en viser "Scan nu (30 kr.)" som ekstra mulighed, i stedet for at `scan` filtreres ud som den aktuelle handling.

Ingen ændringer til OperatorDashboard nødvendige — operatøren ser kun `standard_scan` eller `scan` som `chosen_action`, og begge cases håndteres allerede korrekt.

