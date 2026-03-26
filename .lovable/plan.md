

## Fix: ShippingPrepPage viser forsendelser på dagens dato i stedet for næste torsdag

### Problem
Når i dag er torsdag, beregner de to sider forsendelsesdatoen forskelligt:

- **OperatorDashboard** (`getNextThursday`): Hvis i dag er torsdag → returnerer **næste** torsdag (7 dage frem)
- **ShippingPrepPage** (`getNextShippingDateForItem`): Hvis i dag er torsdag → returnerer **i dag**

Nyregistrerede breve bør ikke sendes samme dag — de skal med næste forsendelsesdag. Operatør-dashboardet har den korrekte logik.

### Løsning
**1 fil**: `src/pages/ShippingPrepPage.tsx`

Opdater `getNextShippingDateForItem` (linje 44-58) så den matcher OperatorDashboard-logikken — hvis i dag er torsdag, returner næste torsdag i stedet for i dag:

```typescript
function getNextShippingDateForItem(tenantTypeName: string, mailType: string): Date {
  const now = new Date();
  const today = startOfDay(now);

  if (mailType === "pakke" || tenantTypeName.toLowerCase() !== "lite") {
    // If today is Thursday, return NEXT Thursday (same as OperatorDashboard)
    const dayOfWeek = today.getDay();
    const daysUntil = (4 - dayOfWeek + 7) % 7 || 7;
    return startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntil));
  }

  // Lite letters: first Thursday of month
  const firstThurs = getFirstThursdayOfMonth(now);
  if (firstThurs > today) return startOfDay(firstThurs);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return startOfDay(getFirstThursdayOfMonth(nextMonth));
}
```

Samme ændring i `getDefaultShippingDate` (linje 31-35) så standarddatoen i kalenderen også peger på næste torsdag:

```typescript
function getDefaultShippingDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntil = (4 - dayOfWeek + 7) % 7 || 7;
  return startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil));
}
```

Begge funktioner springer nu over "i dag" hvis det er torsdag, præcis som operatør-dashboardet gør.

