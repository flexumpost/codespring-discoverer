

## Analyse: Plus-lejer dropdown-regler vs. billedets specifikation

### Fundne uoverensstemmelser

#### Plus Pakker — 2 fejl

**Fejl 1: "Anden afhentningsdag" kræver forkert betingelse**
Koden kræver at `defaultPkgAction === "afhentning"` for at vise "Anden afhentningsdag". Men billedet viser at "Anden afhentningsdag" skal tilbydes **når som helst current action er "afhentning"** — uanset standardhandling. Også i "Ekstra handling"-tabellen vises den ved afhentning.

- Nuværende: default=forsendelse + bruger vælger afhentning → **mangler** "Anden afhentningsdag"
- Korrekt: default=forsendelse + bruger vælger afhentning → **skal vise** "Anden afhentningsdag"

**Fejl 2: Forkert aktionsnavn `standard_forsendelse` for pakker**
Koden bruger `standard_forsendelse` i pakke-dropdowns. Billedet viser bare "Forsendelse (Gebyr 10 kr.)". For Plus-pakker er der ikke et "Standard forsendelse"-koncept — det skal være `send` ("Forsendelse").

#### Plus Breve — OK ✓
Alle kombinationer matcher billedet korrekt.

---

### Plan: Ret Plus pakke-logikken

**Fil: `src/pages/TenantDashboard.tsx`**, linje 57-61

Ændr pakke-logikken så:
- Når `currentAction === "afhentning"` (uanset default): vis `["anden_afhentningsdag", "send", "destruer"]`
- Ellers: vis `["afhentning", "send"].filter(not current) + "destruer"`
- Brug `send` i stedet for `standard_forsendelse` for Plus-pakker

```typescript
if (mailType === "pakke") {
  if (tenantTypeName === "Plus") {
    if (currentAction === "afhentning") {
      return addDestruer(["anden_afhentningsdag", "send"]);
    }
    return addDestruer(["afhentning", "send"].filter(a => a !== currentAction));
  }
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

Dette sikrer:
- Standard=Forsendelse → Afhentning (10 kr.), Destruer (0 kr.) ✓
- Standard=Afhentning → Anden afhentningsdag (10 kr.), Forsendelse (10 kr.), Destruer (0 kr.) ✓
- Ekstra=Forsendelse → Afhentning (10 kr.), Destruer (0 kr.) ✓
- Ekstra=Afhentning → Anden afhentningsdag (10 kr.), Forsendelse (10 kr.), Destruer (0 kr.) ✓

Gebyrerne er allerede korrekte — `getActionPrice` returnerer 10 kr. for både `send` og `afhentning` for Plus-pakker.

