

## Saml "Vælg handling" og "Annuller handling" til én "Handlinger"-kolonne

### Nuværende adfærd
- Kolonne "Vælg handling": dropdown med ekstra handlinger (kun handlinger udover standard)
- Kolonne "Annuller handling": Undo-knap der nulstiller til standardhandling
- To separate kolonner i tabellen

### Ny adfærd
- Én kolonne: **"Handlinger"**
- **Ingen valgt ekstra handling** (`chosen_action === null`): Vis dropdown med ALLE tilgængelige handlinger fra billedets specifikation (inkl. den nuværende standardhandling er allerede aktiv, så den udelades fra listen)
- **Handling valgt** (`chosen_action !== null`): Dropdown forsvinder, erstattet af en "Annuller handling"-knap
- **Klik "Annuller handling"**: Nulstiller `chosen_action` til null, status til "ny", dropdown vises igen

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Fjern "Annuller handling"-kolonnen (TableHead + TableCell)**
Slet headeren på linje 851 og den tilhørende TableCell (linje 1013-1035).

**2. Omdøb "Vælg handling" til "Handlinger"**
Linje 850: `<TableHead>Handlinger</TableHead>`

**3. Omskriv logikken i "Handlinger"-cellen**
Erstat den nuværende dropdown-logik (linje 929-1012) med:

```
Hvis sendt/arkiveret/locked → vis "Arkivér"-knap (uændret)
Hvis chosen_action er sat (og ikke destruer/sendt):
  → Vis "Annuller handling"-knap (Undo2-ikon + tekst)
Ellers (ingen valgt handling):
  → Vis dropdown med alle tilgængelige handlinger for tier+mailtype
     (filtreret så den aktive standardhandling ikke vises)
```

Dropdown-indholdet bruger de eksisterende `getExtraActions`, `getActionLabel` og `getActionPrice` funktioner — ingen ændring af handlings-logikken.

### Hvad ændres IKKE
- Handlings-logikken (getExtraActions, priser, labels) — forbliver uændret
- Gebyr-kolonnen — viser stadig det korrekte gebyr baseret på aktiv handling
- Status-kolonnen — uændret
- Destruer-bekræftelsesdialog, afhentnings-datovælger — uændret

