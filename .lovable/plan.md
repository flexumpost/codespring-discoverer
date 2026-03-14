

## Fix: "Send hurtigst muligt" for Lite-breve viser forkert dato

### Problem
Når en Lite-lejer vælger "Send hurtigst muligt" (`chosen_action === "send"`), kalder `getStatusDisplay` (linje 334-338) `getNextShippingDate("Lite", "brev")`, som returnerer `getFirstThursdayOfMonth()` (månedlig kadence). Men "Send hurtigst muligt" er den **hurtige** option — den skal bruge `getNextThursday()` (ugentlig).

### Ændring

**`src/pages/TenantDashboard.tsx` — linje 334-338**

Erstat `getNextShippingDate` med `getNextThursday()` for `chosen_action === "send"`, da dette altid er den hurtige forsendelse:

```typescript
if (item.chosen_action === "send") {
  const nextDate = getNextThursday();
  const label = item.mail_type === "pakke" ? "Sendes senest" : "Sendes";
  return [label, formatDanishDate(nextDate)];
}
```

### Fil
- `src/pages/TenantDashboard.tsx`

