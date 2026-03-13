

## Fix: "Send hurtigst muligt" bruger forkert dato for Lite-lejere

### Problem
Når en Lite-lejer eksplicit vælger "Send hurtigst muligt" (`chosen_action === "send"`), skal brevet sendes næste torsdag (ugentlig kadence). Men `getOperatorStatusDisplay` kalder `getShippingDate()` som altid returnerer første torsdag i måneden for Lite-breve — uanset om handlingen er eksplicit valgt eller standard.

### Løsning
I `getOperatorStatusDisplay`, linje 94-96: når `chosen_action` er eksplicit sat til `"send"`, brug altid `getNextThursday()` (ugentlig). `getShippingDate()` med Lite-logik skal kun bruges for **standard**-handlinger (linje 119-121).

### Ændring i `src/pages/OperatorDashboard.tsx`

**Linje 94-96** — eksplicit valgt "send":
```typescript
if (action === "send" || action === "under_forsendelse") {
  // Eksplicit valgt → altid næste torsdag (ugentlig kadence)
  const shipDate = getNextThursday();
  return `Skal sendes ${formatDanishDate(shipDate)}`;
}
```

Standard-handlingen (linje 119-121) forbliver uændret — den bruger stadig `getShippingDate()` med tier-logik.

### Fil
- `src/pages/OperatorDashboard.tsx` — linje 94-96

