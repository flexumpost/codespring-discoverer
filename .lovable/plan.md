

## Problem

"Ændr handling"-sektionen i OperatorMailItemDialog vises kun når `item.chosen_action` er sat (linje 378). Brev 2893 bruger sandsynligvis lejerens **standardhandling** (`default_mail_action`), hvilket betyder `chosen_action` er `null` — og sektionen skjules.

## Fix

**File: `src/components/OperatorMailItemDialog.tsx`**

Udvid betingelsen på linje 378 til også at vise sektionen, når der findes en effektiv handling via lejerens standardhandling:

```typescript
// Before:
{!isFinalized && item.chosen_action && (

// After:
{!isFinalized && (item.chosen_action || effectiveAction) && (
```

Beregn `effectiveAction` øverst i komponenten:
```typescript
const effectiveAction = item.chosen_action 
  ?? (item.mail_type === "pakke" 
    ? item.tenants?.default_package_action 
    : item.tenants?.default_mail_action) 
  ?? null;
```

Dette sikrer at sektionen vises for alle aktive forsendelser der har en handling — uanset om den er eksplicit eller via standardhandling.

