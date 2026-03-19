

## Fix: Lite-lejere med pakker og standard "Afhentning" kan ikke vælge afhentningstidspunkt

### Problem
Når en Lite-lejer har "Afhentning" som standardhandling for pakker, filtreres "Afhentning" ud af dropdown-listen (fordi `getExtraActions` fjerner den aktive handling). Lejeren kan derfor ikke booke et specifikt afhentningstidspunkt på en anden dag.

### Løsning
Tilføj en remap i dropdown-logikken (ligesom for breve med `standard_scan` og `standard_forsendelse`), så Lite-pakker med default "afhentning" remappes til en intern nøgle, der holder "afhentning" tilgængelig i dropdown.

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Remap for pakker (linje ~1010-1012)** — tilføj efter de eksisterende remaps:
```typescript
if (!item.chosen_action && tenantTypeName === "Lite" && item.mail_type === "pakke" && effectiveAction === "afhentning") {
  actionForExtras = "standard_afhentning";
}
```

**2. `getExtraActions` (linje 58-66)** — udvid Lite-pakke-logikken til at håndtere `standard_afhentning`:
```typescript
if (mailType === "pakke") {
  if (tenantTypeName === "Lite") {
    if (currentAction === "standard_afhentning") {
      return addDestruer(["afhentning", "standard_forsendelse"]);
    }
    return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
  }
  // ... existing Plus/default logic
}
```

**3. `availableExtras` filter (linje 1014-1015)** — sikr at `standard_afhentning`-remappet fungerer korrekt (ingen ændring nødvendig, da "afhentning" allerede er i `allowedActions`).

**4. Labels og priser** — "Afhentning" for Lite-pakker skal vise "50 kr." (allerede håndteret af eksisterende gebyr-logik). Baseret på det uploadede billede er de korrekte muligheder:
- Forsendelse: 50 kr. (+ porto)
- Afhentning: 50 kr.
- Destruktion: 0 kr.

Ingen database-ændringer nødvendige.

