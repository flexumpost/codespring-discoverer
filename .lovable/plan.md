

## Vis "Afventer scanning" som status naar "Åben og scan" vaelges

### Problem
Naar en lejer vaelger "Åben og scan", saettes status til "afventer_handling" i databasen. Paa lejer-dashboardet vises dette som "Afventer handling" i stedet for det mere praecise "Afventer scanning". Paa operatoer-siden virker filteret allerede korrekt (filtrerer paa `chosen_action === "scan"`).

### Loesning

Aendringen er udelukkende i **TenantDashboard.tsx** — en visuel tilpasning af status-badge:

1. **Status-badge logik**: Naar en forsendelse har `chosen_action === "scan"` og ingen `scan_url`, vises status-badge som **"Afventer scanning"** i stedet for den raa database-status.
2. **Operatoer-dashboard**: Ingen aendringer nødvendige — "Åben og scan"-fanen filtrerer allerede korrekt paa `chosen_action === "scan"`, og forsendelser med status `afventer_handling` hentes allerede.

### Teknisk detalje

I `TenantDashboard.tsx`, linje ~348 hvor status-badge renderes:

```text
// Nuvaerende kode:
<Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>

// Ny kode:
<Badge variant="outline">
  {item.chosen_action === "scan" && !item.scan_url
    ? "Afventer scanning"
    : STATUS_LABELS[item.status]}
</Badge>
```

Samme logik tilfojes i detalje-dialogen (linje ~439) saa status ogsaa vises korrekt der.

### Resultat
- Naar lejer vaelger "Åben og scan", viser status-badge "Afventer scanning"
- Naar operatoeren uploader scanningen, skifter status automatisk til "Ulæst" (via eksisterende trigger)
- Operatoer-dashboardet viser forsendelsen under "Åben og scan" fanen (virker allerede)

