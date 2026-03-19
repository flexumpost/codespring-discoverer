

## Fix: Fjern klokkeslet fra "Standard afhentningsdag" for Standard-breve

### Problem
Når en Standard-lejer vælger "Standard afhentningsdag", gemmes pickup_date med kl. 09:00, og visningen viser "Torsdag den 26. marts kl. 09:00-10:00". For standard afhentningsdag skal der kun vises datoen — intet klokkeslet.

### Løsning

**1. `handleAction` i `src/pages/TenantDashboard.tsx` (linje 687-688)** — gem pickup_date uden klokkeslet (midnat):
```typescript
const nextThurs = getNextThursday();
nextThurs.setHours(0, 0, 0, 0);
```

**2. `formatPickupDisplay` i `src/pages/TenantDashboard.tsx` (linje 310-318)** — vis kun dato når klokkeslet er midnat (= standard afhentningsdag):
```typescript
function formatPickupDisplay(...): string | null {
  ...
  const hour = date.getHours();
  if (hour === 0) {
    return `${dayName} den ${d}. ${month}`;
  }
  return `${dayName} den ${d}. ${month} kl. ${hour...}`;
}
```

**3. `formatPickupDisplay` i `src/pages/OperatorDashboard.tsx` (linje 99-109)** — samme logik: spring klokkeslet over når time = 0:
```typescript
if (hour === 0) {
  return `${dayName} den ${d}. ${month}`;
}
```

