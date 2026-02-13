

## Fix: Scannede forsendelser forsvinder fra operatoer-dashboardet

### Problem

Naar operatoeren uploader en scanning, saettes forsendelsens status til `"ulaest"`. Men `refreshMail()` henter kun forsendelser med status `"ny"` eller `"afventer_handling"`. Derfor forsvinder den scannede forsendelse helt fra operatoer-dashboardet.

### Loesning

Udvid status-filtret i `refreshMail()` til ogsaa at inkludere `"ulaest"`, saa scannede forsendelser (med `chosen_action === "scan"`) forbliver synlige.

### Aendring

**Fil: `src/pages/OperatorDashboard.tsx` (linje 99)**

Aendr:
```text
.in("status", ["ny", "afventer_handling"])
```

til:
```text
.in("status", ["ny", "afventer_handling", "ulaest"])
```

### Resultat

- Forsendelse 2800 (scannet, status "ulaest") forbliver synlig i tabellen under "Aaben og scan"
- Kort-taelleren viser stadig kun ventende scanninger (takket vaere `countFilter`)
- Ingen andre filer aendres
