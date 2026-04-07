

## Analyse: Eksisterende planer vs. nødvendige gebyrscenarier

### Dine eksisterende planer (5 stk.)
| Plan | Pris |
|------|------|
| Brev/pakke afhentning (Lite) | 50 kr |
| Brev/pakke afhentning (Standard) | 30 kr |
| Pakke afhentning (Plus) | 10 kr |
| Scanning af brev (Lite) | 50 kr |
| Scanning af brev (Standard) | 30 kr |

### Alle gebyrscenarier med amountKr > 0

| Scenarie | Tier | Beløb | Dækket af plan? |
|----------|------|-------|-----------------|
| Pakke afhentning | Lite | 50 kr | ✅ Brev/pakke afhentning (Lite) |
| Pakke afhentning | Standard | 30 kr | ✅ Brev/pakke afhentning (Standard) |
| Pakke afhentning | Plus | 10 kr | ✅ Pakke afhentning (Plus) |
| Pakke forsendelse | Lite | 50 kr | ❌ Mangler |
| Pakke forsendelse | Standard | 30 kr | ❌ Mangler |
| Pakke forsendelse | Plus | 10 kr | ❌ Mangler |
| Brev scan | Lite | 50 kr | ✅ Scanning af brev (Lite) |
| Brev scan | Standard | 30 kr | ✅ Scanning af brev (Standard) |
| Brev afhentning | Lite | 50 kr | ✅ Brev/pakke afhentning (Lite) |
| Brev afhentning | Standard | 30 kr | ✅ Brev/pakke afhentning (Standard) |
| Brev forsendelse | Lite | 50 kr | ❌ Mangler |

### Manglende planer (4 stk. at oprette i OfficeRnD)

1. **Pakke forsendelse (Plus)** — 10 kr
2. **Pakke forsendelse (Standard)** — 30 kr
3. **Pakke forsendelse (Lite)** — 50 kr
4. **Brev forsendelse (Lite)** — 50 kr

### Kodeændring: Map gebyrer til plan-navne

Opdater `sync-officernd-charge` Edge Function til at:

1. **Bestemme det korrekte plan-navn** baseret på kombination af mail_type, action og tier (f.eks. "Brev/pakke afhentning (Standard)")
2. **Hente planer fra OfficeRnD API** via `GET /fees/plans` og finde plan-ID'et ud fra navnet
3. **Bruge plan-referencen** i `POST /fees` kaldet, så gebyret korrekt tilknyttes en eksisterende plan og vises i OfficeRnD UI

### Mapping-logik

```text
pakke + afhentning → "Brev/pakke afhentning ({tier})"    (Plus→special name)
pakke + send       → "Pakke forsendelse ({tier})"
brev + scan        → "Scanning af brev ({tier})"
brev + afhentning  → "Brev/pakke afhentning ({tier})"
brev + send        → "Brev forsendelse ({tier})"
```

### Verifikation
1. Du opretter de 4 manglende planer i OfficeRnD
2. Vi deployer den opdaterede Edge Function
3. Markerer eksisterende brev 2976 entry som `superseded`
4. Kører sync manuelt og verificerer at gebyret nu vises under lejerens konto

