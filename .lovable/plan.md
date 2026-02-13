

## Fix: Scannede forsendelser med status "laest" forsvinder fra operatoer-dashboardet

### Problem

Brev 2800 har status `"laest"` fordi lejeren har aabnet scanningen. Men operatoer-dashboardet henter kun forsendelser med status `"ny"`, `"afventer_handling"` og `"ulaest"`. Derfor vises brevet slet ikke.

### Loesning

Udvid status-filtret i `refreshMail()` til ogsaa at inkludere `"laest"`:

```text
.in("status", ["ny", "afventer_handling", "ulaest", "laest"])
```

Dette sikrer at alle aktive forsendelser (inklusive laeste) forbliver synlige paa operatoer-dashboardet. Kun `"arkiveret"` forsendelser udelades.

### Fil der aendres
- `src/pages/OperatorDashboard.tsx` — linje 99: tilfoej `"laest"` til status-arrayet

### Resultat
- Brev 2800 (status "laest", chosen_action "scan", har scan_url) vises igen under "Aaben og scan"
- Kort-taelleren forbliver 0 (korrekt, da brevet allerede er scannet — countFilter checker `!scan_url`)
- Forsendelser forsvinder foerst naar de arkiveres
