

## Plus-lejer handlingslogik for breve

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Fix `getNextThursday()` (linje 103-111)**
Hvis i dag er torsdag, returner næste torsdag (ikke i dag). Brugerens krav: "hvis dagen er torsdag, så vælges næste torsdag".

**2. Opdater `getExtraActions` (linje 43-53)**
Funktionen skal filtrere baseret på `effectiveAction` (den aktuelle handling) i stedet for `defaultAction`. Tilføj "anden_afhentningsdag" som mulighed, når den effektive handling er "afhentning".

Logik per effektiv handling (Plus breve):
- **afhentning** → vis: "Åben og scan", "Forsendelse", "Anden afhentningsdag"
- **scan** → vis: "Forsendelse", "Afhentning"
- **send** → vis: "Åben og scan", "Afhentning"

**3. Opdater `getStatusDisplay` (linje 143-198)**
- Default `afhentning` (ingen `chosen_action`): Status = "Afhentes" + `formatDanishDate(getNextThursday())`
- Default `scan`: Status = "Afventer scanning" + "Scannes inden for 24 timer"
- Default `send`: Status = "Sendes" + `formatDanishDate(getNextThursday())`
- Chosen `send`: Status = "Sendes" + `formatDanishDate(getNextThursday())`
- Chosen `afhentning`: Status = "Afhentning bestilt" + [valgt tidspunkt]

**4. Tilføj "Anden afhentningsdag" i ACTION_LABELS (linje 34-40)**
Ny entry: `anden_afhentningsdag: "Anden afhentningsdag"`

**5. Opdater `handleAction` (linje 369-377)**
"anden_afhentningsdag" skal åbne pickup-dialogen (samme som "afhentning").

**6. Opdater dropdown-kaldet (linje 577)**
Send `effectiveAction` til `getExtraActions` i stedet for `defaultAction`. Vis kun pris når handlingen afviger fra `defaultAction`.

**7. Pris-visning (linje 606)**
Kun vis pris for handlinger der ikke er lejerens standard:
```typescript
{action !== defaultAction && price ? ` (${price})` : ""}
```

### Ingen databaseændringer

