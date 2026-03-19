

## Fix: "Ekstra forsendelse" mangler i dropdown for Lite breve

### Årsag

Samme mønster som `scan`/`standard_scan`-problemet: Når en Lite-lejer ikke har valgt en handling, falder `effectiveAction` tilbage til `"send"` (linje 948). Dropdown-logikken bruger `"send"` som den aktive handling og ekskluderer den fra listen — derfor vises "Ekstra forsendelse" aldrig.

### Løsning

Tilføj en remapping i `src/pages/TenantDashboard.tsx` ved linje 1006-1008, så Lite breve uden valgt handling og `effectiveAction === "send"` remappes til `"standard_forsendelse"`:

```typescript
// Existing remap
if (!item.chosen_action && tenantTypeName === "Lite" && effectiveAction === "scan") {
  actionForExtras = "standard_scan";
}
// NEW remap
if (!item.chosen_action && tenantTypeName === "Lite" && effectiveAction === "send") {
  actionForExtras = "standard_forsendelse";
}
```

Dette sikrer at `getExtraActions` bruger `"standard_forsendelse"` som aktiv handling → `"send"` (Ekstra forsendelse) inkluderes i dropdown-listen.

### Ingen andre ændringer
Labels, priser og rækkefølge er allerede korrekte fra tidligere ændringer.

