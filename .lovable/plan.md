

## Plan: Opdater Lite brev-flow med kontekst-afhængige handlinger og korrekte statusser

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. `getExtraActions()` — Lite-case (linje 65-67)**

Erstat den simple filtrering med kontekst-afhængig logik. Lite bruger lidt andre labels ("Scan nu", "Send hurtigst muligt") men mapper til samme action-keys:

```typescript
if (tenantTypeName === "Lite") {
  switch (currentAction) {
    case "afhentning": return ["scan", "send", "anden_afhentningsdag"];
    case "scan":       return ["send", "afhentning"];
    case "send":       return ["scan", "afhentning"];
    default:           return ["scan", "send", "afhentning"];
  }
}
```

**2. `ACTION_LABELS` — Lite-specifikke labels**

Lite har anderledes labels ("Scan nu" i stedet for "Åben og scan", "Send hurtigst muligt" i stedet for "Forsendelse"). Dette løses ved at lave en `getActionLabel(action, tenantTypeName)` hjælpefunktion der returnerer Lite-specifikke labels når relevant:
- `scan` → "Scan nu" (for Lite)
- `send` → "Send hurtigst muligt" (for Lite)

**3. `getStatusDisplay()` — Lite default-handlinger (linje 190-212)**

Ret status for Lite-lejere når **ingen ekstra handling er valgt** (default):

| Default handling | Status |
|---|---|
| afhentning | "Afhentes [første torsdag i måneden]" (bruger `getFirstThursdayOfMonth`) |
| scan | "Scannes gratis den første torsdag i måneden [dato]" |
| send | "Sendes [første torsdag i måneden]" |

Aktuelt bruger `effectiveAction === "afhentning"` fejlagtigt `getNextThursday()` — for Lite skal den bruge `getNextShippingDate("Lite", "brev")` som returnerer `getFirstThursdayOfMonth()`.

Aktuelt bruger `effectiveAction === "scan"` teksten "Scannes inden for 24 timer" — for Lite default-scan skal den i stedet vise "Scannes gratis den første torsdag i måneden [dato]".

Når en **ekstra handling** vælges (chosen_action sat):
- `scan` → "Afventer scanning — Scannes inden for 24 timer" (allerede korrekt)
- `send` → "Sendes [næste torsdag]" via `getNextThursday()` (allerede korrekt)
- `afhentning` → "Afhentning bestilt [valgte tidspunkt]" (allerede korrekt)

**4. `getFirstThursdayOfMonth()` korrektion (linje 99-116)**

Funktionen bruger `firstThursday <= now` som sammenligning. Dette betyder at **på** den første torsdag (efter midnat) vælges næste måned. Det er korrekt. Men den 1. april (som ikke er torsdag) med første torsdag den 2. april skal korrekt returnere 2. april — dette virker allerede, da `firstThursday > now` på det tidspunkt.

### Fil der ændres
- `src/pages/TenantDashboard.tsx`

