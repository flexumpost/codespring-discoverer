

## Fix: Afhentningsgebyr på operatør-dashboard viser ikke 0 kr. på torsdage

### Problem
I `getItemFee` (OperatorDashboard.tsx) tjekkes afhentningsdatoen kun for gratis-dage når handlingen **matcher** standardhandlingen (linje 242-262). Når afhentning **ikke** er standardhandlingen, falder den igennem til `ACTION_TO_FEE_KEY`-opslaget (linje 265) som altid returnerer "30 kr." for Standard — uden at tjekke om datoen er en torsdag.

### Ændring

**`src/pages/OperatorDashboard.tsx` — linje 264 (før `ACTION_TO_FEE_KEY`-opslaget)**

Tilføj et free-day check for afhentning, også når det ikke er standardhandlingen:

```typescript
// After line 263 (return "—";), before the feeKey lookup:
if (item.chosen_action === "afhentning" && tier !== "Plus") {
  const pickupDate = item.notes?.startsWith("PICKUP:")
    ? new Date(item.notes.replace("PICKUP:", ""))
    : null;
  if (pickupDate && !isNaN(pickupDate.getTime())) {
    const isLite = tier === "Lite";
    const isFreeDay = isLite
      ? (() => {
          const firstThurs = getFirstThursdayOfMonth(pickupDate);
          return pickupDate.getDate() === firstThurs.getDate()
            && pickupDate.getMonth() === firstThurs.getMonth();
        })()
      : pickupDate.getDay() === 4;
    if (isFreeDay) return "0 kr.";
  }
}
```

Dermed returneres "0 kr." for Standard-lejere der vælger afhentning på en torsdag, uanset om afhentning er deres standardhandling eller ej.

