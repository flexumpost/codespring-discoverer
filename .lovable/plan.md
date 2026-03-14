

## Fix: "Scan nu" forsendelser tælles ikke i "Åben og scan" tælleren

### Problem
`countFilter` for "Åben og scan" bruger `getShippingDate()` til at beregne scanningsdatoen for **alle** scan-typer. Men `getShippingDate()` returnerer næste torsdag (for Plus/Standard) — det er forkert for "Scan nu" (`chosen_action === "scan"`), som er en 24-timers handling og altid bør tælles med, hvis den endnu ikke er scannet.

### Løsning

**`src/pages/OperatorDashboard.tsx`** — opdater `countFilter` (linje 206-210):

- **"scan" (Scan nu)**: Tæl altid med hvis `!scan_url` (endnu ikke scannet). Ingen datotjek nødvendigt.
- **"standard_scan"**: Behold eksisterende logik med `getShippingDate()` og `isTodayOrPastDate`.

```typescript
countFilter: (item) => {
  if (item.scan_url) return false;
  if (item.chosen_action === "scan") return true; // Scan nu — altid aktuel
  if (item.chosen_action === "standard_scan") {
    const scanDate = getShippingDate(item.tenants?.tenant_types?.name, item.mail_type);
    return isTodayOrPastDate(scanDate);
  }
  return false;
},
```

### Fil
- **Ændret**: `src/pages/OperatorDashboard.tsx` — 4 linjer i countFilter

