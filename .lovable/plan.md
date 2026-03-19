

## Fix: Standard-lejere — pakke-dropdown skal altid vise alle 3 handlinger

### Problem
For Standard-lejere med pakker falder `getExtraActions` igennem til default-casen, som filtrerer den aktuelle handling fra. Ifølge billedet skal dropdown altid vise alle tre muligheder: Forsendelse, Afhentning og Destruktion — uanset standardhandlingen.

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. `getExtraActions` (linje 58-71)** — tilføj Standard-pakke-logik med remap-håndtering:
```typescript
if (mailType === "pakke") {
  if (tenantTypeName === "Plus") { /* uændret */ }
  if (tenantTypeName === "Lite") { /* uændret */ }
  if (tenantTypeName === "Standard") {
    if (currentAction === "standard_afhentning" || currentAction === "standard_forsendelse") {
      return addDestruer(["afhentning", "send"]);
    }
    return addDestruer(["afhentning", "send"].filter(a => a !== currentAction));
  }
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

**2. Remap-logik (linje ~1022-1031)** — tilføj remap for Standard-pakker, så standardhandlingen remappes og alle valg forbliver synlige:
```typescript
if (!item.chosen_action && tenantTypeName === "Standard" && item.mail_type === "pakke") {
  if (effectiveAction === "afhentning") actionForExtras = "standard_afhentning";
  else if (effectiveAction === "send") actionForExtras = "standard_forsendelse";
}
```

**3. `availableExtras` filter (linje 1034)** — tilføj `standard_afhentning` til allowed-check:
```typescript
|| (a === "standard_afhentning" && allowedActions.includes("afhentning"))
```

**4. Labels** — `ACTION_LABELS` bruger allerede "Forsendelse" for `send` og "Afhentning" for `afhentning`. Priserne for Standard pakker er allerede korrekte (30 kr. / 30 kr. + porto / 0 kr.).

**5. `handleAction`** — Standard-pakker med `"afhentning"` skal åbne datovælgeren (ikke auto-assign torsdag som for breve). Tjek at den eksisterende auto-assign logik kun gælder breve:
- Den nuværende kode tjekker `tenantTypeName === "Standard"` men skelner ikke mailtype. Tilføj `item.mail_type !== "pakke"` til betingelsen.

Ingen database-ændringer.

