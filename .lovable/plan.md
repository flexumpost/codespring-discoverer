

## Fix: Lite-brev statusvisning og "Ekstra forsendelse"-dato

### Problem
For Lite-brev nr. 2800:
- **Standard forsendelse** (ingen handling valgt) skal vise **2. april** (første torsdag i april) — dette virker allerede korrekt
- **Ekstra forsendelse** (når "send" vælges) skal vise **12. marts** (førstkommende torsdag) — men koden bruger samme `getNextShippingDate()` som returnerer april-datoen
- Dropdown skal være tom som default — dette virker allerede med den nuværende `value`-logik

### Ændring i `src/pages/TenantDashboard.tsx`

**`getStatusDisplay`**, linje 159-161: Når `chosen_action === "send"`, brug altid `getNextThursday()` (førstkommende torsdag) i stedet for `getNextShippingDate()` — fordi "Ekstra forsendelse" per definition er en ekstra forsendelse uden for den normale Lite-kadence.

```typescript
// Før:
if (item.chosen_action === "send") {
  const nextDate = getNextShippingDate(tenantTypeName, item.mail_type);
  return ["Sendes på næste forsendelsesdag", formatDanishDate(nextDate)];
}

// Efter:
if (item.chosen_action === "send") {
  const nextDate = getNextThursday(); // Ekstra forsendelse = førstkommende torsdag
  return ["Ekstra forsendelse", formatDanishDate(nextDate)];
}
```

Dette er en enkelt ændring. Dropdown-default er allerede tom.

