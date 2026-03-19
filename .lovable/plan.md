

## Fix: "Standard afhentningsdag" skal ikke åbne datovælger for Standard-lejere

### Problem
Når en Standard-lejer vælger "Standard afhentningsdag" (action = `"afhentning"`), åbner `handleAction` altid datovælger-dialogen. For Standard-lejere er standard afhentningsdag altid den næste torsdag — der er ingen grund til at vælge dato manuelt.

### Løsning
Ændr `handleAction` i `src/pages/TenantDashboard.tsx` (linje 683-691), så Standard-lejere med action `"afhentning"` **springer datovælgeren over** og i stedet direkte kalder `choosePickup.mutate` med næste torsdag som `pickup_date`.

### Ændring i `src/pages/TenantDashboard.tsx`

**`handleAction` (linje 683-691):**
```typescript
const handleAction = (id: string, action: string) => {
  if (action === "afhentning" || action === "anden_afhentningsdag") {
    // Standard-lejere: "Standard afhentningsdag" auto-assigns next Thursday
    if (action === "afhentning" && tenantTypeName === "Standard") {
      const nextThurs = getNextThursday();
      nextThurs.setHours(9, 0, 0, 0);
      choosePickup.mutate({ id, pickupIso: nextThurs.toISOString() });
      return;
    }
    setPickupDialogItem(id);
  } else if (action === "destruer") {
    setConfirmDestroy(id);
  } else {
    chooseAction.mutate({ id, action });
  }
};
```

Dette sikrer at:
- Standard + "Standard afhentningsdag" → auto-sættes til næste torsdag, ingen dialog
- Standard + "Ekstra afhentningsdag" → datovælger åbnes (uændret)
- Lite + "Afhentning"/"Ekstra afhentning" → datovælger åbnes (uændret)

Ingen andre ændringer nødvendige.

