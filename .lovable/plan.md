

## Opdater "Ubehandlet" filter: Ekskludér scannet post

### Ændring

Udvid `isUnprocessed`-funktionen i `src/pages/OperatorDashboard.tsx` til også at ekskludere post der har en `scan_url`, uanset status (læst/ulæst).

### Teknisk detalje

**Fil:** `src/pages/OperatorDashboard.tsx` (linje 26-32)

Tilføj en ekstra betingelse der ekskluderer alle items med `scan_url`:

```typescript
function isUnprocessed(item: MailItem): boolean {
  const doneStatuses = ["sendt_med_dao", "sendt_med_postnord", "sendt_retur", "arkiveret"];
  if (doneStatuses.includes(item.status)) return false;
  if (item.chosen_action === "afhentet") return false;
  if (item.scan_url) return false; // Ekskludér al scannet post (læst + ulæst)
  return true;
}
```

Den eksisterende betingelse på linje 30 (der kun ekskluderede scan-items med scan_url) erstattes af den bredere check `if (item.scan_url) return false` — som fanger alle scannede items uanset `chosen_action`.

