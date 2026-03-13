

## Plan: Opdater status-visning i Operatør-dashboard

### Ændring i `src/pages/OperatorDashboard.tsx`

**Nuværende adfærd:** Status-kolonnen viser blot `STATUS_LABELS[item.status]` (f.eks. "Ny", "Afventer handling") plus pickup-info fra notes.

**Ny adfærd:** Når et brev har en `chosen_action`, vises en handlings-specifik status:

| `chosen_action` | Status-tekst |
|---|---|
| `send` / `under_forsendelse` | "Skal sendes [dato]" — beregnet som næste torsdag via `getNextThursday()` |
| `afhentning` | "Afhentning bestilt [dato]" — parsed fra `notes` (PICKUP:iso) |
| `scan` | "Scanning bestilt [dag og tid HH:MM]" — parsed fra `notes` eller fallback til "Afventer scanning" |

Hvis ingen `chosen_action` er sat, vises den eksisterende `STATUS_LABELS[item.status]`.

### Tekniske detaljer

1. **Tilføj `getNextThursday()` hjælpefunktion** — kopieret fra TenantDashboard (returnerer næste torsdag, springer over hvis i dag er torsdag).

2. **Tilføj `getOperatorStatusDisplay()` funktion** der returnerer status-tekst baseret på `chosen_action` og `notes`.

3. **Opdater Status-cellen** (linje 237-244) til at bruge den nye funktion i stedet for `STATUS_LABELS[item.status]`.

4. **Formatering:** Datoer formateres på dansk med `formatDanishDate()` (allerede tilgængelig via DANISH_DAYS/MONTHS). Scan-tidspunkt vises som "dag HH:MM".

### Fil der ændres
- `src/pages/OperatorDashboard.tsx`

