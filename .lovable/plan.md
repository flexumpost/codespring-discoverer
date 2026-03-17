

## Fix: "Scan nu" viser 0 kr. i stedet for 50 kr. for Lite-lejere med scan-default

### Problem
Når en Lite-lejer har `default_mail_action = "scan"` og vælger "Scan nu", returnerer `getItemFee` "0 kr." fordi `chosenAction === defaultAction` ("scan" === "scan") matcher på linje 156, som returnerer "0 kr." — den rammer aldrig linje 178 hvor den korrekte pris beregnes.

Det er samme semantiske problem som "Scan nu"-knappen: default "scan" = gratis månedlig scanning, eksplicit "scan" = betalt øjeblikkelig scanning.

### Løsning

**Fil:** `src/pages/TenantDashboard.tsx`, linje ~156

Tilføj en undtagelse i `getItemFee` funktionen: Når `chosenAction === "scan"` og `defaultAction === "scan"` for Lite-lejere, skal den IKKE behandles som "ingen ændring" men fortsætte til gebyrberegningen.

```typescript
if (!chosenAction || chosenAction === defaultAction) {
  // Exception: Lite default "scan" (monthly) vs explicit "scan" (immediate) are different
  if (!(chosenAction === "scan" && defaultAction === "scan" && tenantTypeName === "Lite")) {
    // ... existing logic for standard/free handling
  }
}
```

Én ændring, ingen database-migrering.

