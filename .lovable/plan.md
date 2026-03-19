

## Problem

Når en Plus-lejer har "Forsendelse" som standardhandling for pakker og manuelt vælger "Afhentning", vises "Anden afhentningsdag" i dropdown. Det er forkert — "Anden afhentningsdag" skal KUN tilbydes når lejerens **standardhandling** er "Afhentning" (dvs. den automatiske torsdag-afhentning).

Korrekte regler for Plus-pakker:
- **Standard = Afhentning** → ekstra: Anden afhentningsdag, Standard forsendelse, Destruer
- **Standard = Forsendelse** → ekstra: Afhentning (10 kr.), Destruer (0 kr.)

## Løsning

**Fil: `src/pages/TenantDashboard.tsx`**

### 1. Udvid `getExtraActions` med en `defaultAction`-parameter

Tilføj en fjerde parameter `defaultAction` til funktionen, så den kan skelne mellem lejerens standard og den aktuelt valgte handling.

### 2. Opdater pakke-logikken for Plus

```typescript
if (mailType === "pakke") {
  if (tenantTypeName === "Plus" && defaultAction === "afhentning" && currentAction === "afhentning") {
    // Kun vis "anden afhentningsdag" når standard ER afhentning
    return addDestruer(["anden_afhentningsdag", "standard_forsendelse"]);
  }
  return addDestruer(["afhentning", "standard_forsendelse"].filter(a => a !== currentAction));
}
```

### 3. Opdater kaldet (linje ~961)

Send `defaultAction` med som fjerde argument:

```typescript
const extraActions = getExtraActions(tenantTypeName, item.mail_type, actionForExtras, defaultAction);
```

Dette sikrer at en Plus-lejer med forsendelse som standard kun ser "Afhentning" og "Destruer" — aldrig "Anden afhentningsdag".

