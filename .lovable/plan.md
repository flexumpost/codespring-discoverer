

## Tællere viser kun handlinger der er aktuelle i dag

### Problem
Tællerne på "Åben og scan", "Send" og "Afhentes" kortene tæller alle forsendelser uanset handlingsdato. De bør kun tælle forsendelser hvis handlingsdato er **i dag**, mens alle forsendelser (fremtidige og tidligere) stadig vises i listen.

### Løsning

Opdater `countFilter` for de tre kort i `CARD_FILTERS` (linje 186-205) i `src/pages/OperatorDashboard.tsx`:

**"Åben og scan"** — Tæl kun items hvor:
- `chosen_action === "scan"` og `!scan_url` (ikke scannet endnu)
- Handlingen er bestilt i dag eller tidligere (dvs. allerede forfalden — da "Scan nu" er 24h, tælles den kun hvis den endnu ikke er udført)

Reelt set: Behold eksisterende logik (`!scan_url`) da "Scan nu" altid er akut. Men for at håndtere eksemplet med forsendelse 2816 der først skal scannes 2. april, skal `countFilter` beregne scanningsdatoen og kun tælle hvis datoen ≤ i dag.

**"Send"** — Tæl kun items hvor:
- `chosen_action === "send"` og forsendelsdatoen (`getNextThursday()`) er **i dag**
- `chosen_action === "under_forsendelse"` tælles ikke (allerede pakket)

**"Afhentes"** — Tæl kun items hvor:
- `chosen_action === "afhentning"` og `pickup_date` er **i dag**

### Kodeændring

Da `countFilter` er statiske funktioner der ikke har adgang til tenant-type for at beregne scanningsdato, ændres tilgangen:

1. Fjern `countFilter` fra `CARD_FILTERS`-arrayet for disse tre kort
2. Beregn counts dynamisk i komponentens body (linje 377-380) med adgang til item-data inkl. tenant-type

```typescript
// Hjælpefunktion
function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isTodayOrPast(date: Date): boolean {
  const now = new Date();
  now.setHours(0,0,0,0);
  date.setHours(0,0,0,0);
  return date <= now;
}

// I counts-beregningen, erstat countFilter for de tre kort:
// "Åben og scan": item.chosen_action === "scan" && !item.scan_url && scanningsdato er i dag eller passeret
// "Send": (item.chosen_action === "send") && forsendelsdato er i dag
// "Afhentes": item.chosen_action === "afhentning" && pickup_date er i dag
```

For "Åben og scan": Scanningsdato for `scan` (Scan nu) er reelt "nu" (24h), men brugeren siger 2816 ikke skal tælle før 2. april. Det tyder på at scanningsdato beregnes ud fra tenant-type/kadence. Tæl kun hvis scanningsdatoen `isTodayOrPast` og endnu ikke scannet.

### Fil
- **Ændret**: `src/pages/OperatorDashboard.tsx` — dynamiske countFilters der tjekker handlingsdato mod i dag

