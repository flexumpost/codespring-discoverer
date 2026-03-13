

## Fix: Lite afhentnings-gebyr vises ikke for ikke-gratis dage

### Problem
Når en Lite-lejer har `default_action = "afhentning"` og vælger "Anden afhentningsdag", gemmes `chosen_action = "afhentning"` — identisk med default. Linje 116 i `getItemFee` returnerer straks "0 kr." fordi `chosenAction === defaultAction`, uden at tjekke om den valgte pickup-dato faktisk er den gratis første torsdag.

### Løsning
I `getItemFee`, når `chosenAction === defaultAction === "afhentning"`, tjek pickup-datoen fra notes. Hvis datoen **ikke** er en gratis torsdag, returner det korrekte gebyr (50 kr. for Lite).

### Ændring i `src/pages/TenantDashboard.tsx`

**Linje 115-119** — udvid early-return logikken:

```typescript
  if (!chosenAction || chosenAction === defaultAction) {
    // Special case: afhentning on a non-free day still costs extra
    if (chosenAction === "afhentning" && tenantTypeName !== "Plus") {
      const pickupDate = parsePickupDateFromNotes(notes);
      if (pickupDate && !isFreeTorsdag(pickupDate, tenantTypeName)) {
        return tenantTypeName === "Standard" ? "50 kr." : "50 kr.";
      }
    }
    if ((chosenAction || defaultAction) === "send") return "0 kr. + porto";
    return "0 kr.";
  }
```

Én ændring i én fil. Resten af logikken (for ekstra handlinger der afviger fra default) er uændret.

