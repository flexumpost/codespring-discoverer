

## Fix: Gebyr vises ikke korrekt for afhentning på operatør-dashboardet

### Problem
Operatør-dashboardets `getItemFee()` (linje 228) returnerer "—" når `chosen_action === defaultAction`, uden at tjekke om pickup-datoen falder på en gratis torsdag. Samme fejl som blev rettet på lejer-dashboardet.

Eksempel: Brev 2816 (Lite, default=afhentning, chosen=afhentning, PICKUP:2026-03-18 = tirsdag) bør vise "50 kr." men viser "—".

### Løsning
Tilføj den samme pickup-dato-validering i operatør-dashboardets `getItemFee()` som allerede findes i lejer-dashboardet.

### Ændring i `src/pages/OperatorDashboard.tsx`

**Linje 226-228** — udvid logikken for afhentning:

```typescript
// Brev: only charge if action differs from default
const defaultAction = item.tenants?.default_mail_action;
if (item.chosen_action === defaultAction) {
  // Special case: afhentning on a non-free day still costs extra
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
        : pickupDate.getDay() === 4; // Standard: any Thursday
      if (!isFreeDay) {
        return "50 kr.";
      }
    }
  }
  return "—";
}
```

Bruger eksisterende `getFirstThursdayOfMonth()` som allerede er defineret i filen. Ingen andre ændringer.

