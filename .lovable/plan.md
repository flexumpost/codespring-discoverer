

## Forsendelse 2816 mangler i "Åben og scan" — årsag og fix

### Problem
"Åben og scan"-kortets `filter` (linje 205) matcher kun `chosen_action === "scan"`, men forsendelse 2816 har `chosen_action === "standard_scan"`. Derfor vises den ikke.

### Løsning

**`src/pages/OperatorDashboard.tsx`** — opdater "Åben og scan" card filter:

- **`filter`** (linje 205): Udvid til `item.chosen_action === "scan" || item.chosen_action === "standard_scan"`
- **`countFilter`** (linje 206-210): Udvid tilsvarende — tæl begge scan-typer, men kun hvis `!scan_url` og scanningsdato er i dag eller passeret

### Fil
- **Ændret**: `src/pages/OperatorDashboard.tsx` — 2 linjer i CARD_FILTERS

