

## Fix: "Scan nu" mangler for Lite-lejere med standard scan-default

### Problem

Når en Lite-lejer har `default_mail_action = "scan"`, opfører systemet sig korrekt ved at vise "Scannes den 2. april" (månedlig gratis scanning). Men i `getExtraActions` fjernes "scan" fra listen fordi den allerede er `currentAction`. Problemet er at default "scan" for Lite = månedlig scanning, mens eksplicit valgt "scan" = øjeblikkelig scanning ("Scan nu"). De er semantisk forskellige, men bruger samme nøgle.

### Løsning

I handlings-logikken (linje ~862) hvor `getExtraActions` kaldes, skal vi behandle Lite-lejeres default "scan" som "standard_scan" når der ikke er nogen eksplicit `chosen_action`. Det sikrer at "Scan nu" (øjeblikkelig) stadig tilbydes som ekstra handling.

**Fil:** `src/pages/TenantDashboard.tsx`, omkring linje 862

Ændring: Før kaldet til `getExtraActions`, tilføj logik der mapper effectiveAction:

```typescript
// When Lite tenant has default "scan" (which behaves as monthly/standard_scan),
// treat it as "standard_scan" so immediate "scan" remains available
let actionForExtras = effectiveAction;
if (!item.chosen_action && tenantTypeName === "Lite" && effectiveAction === "scan") {
  actionForExtras = "standard_scan";
}
const extraActions = getExtraActions(tenantTypeName, item.mail_type, actionForExtras);
```

Dette gør at `getExtraActions("Lite", "brev", "standard_scan")` returnerer `["scan", "send", "standard_forsendelse", "afhentning", "destruer"]` — inklusiv "Scan nu".

