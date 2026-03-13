

## Fix: Korrekt forsendelsesdato for Lite-lejere på operatør-dashboard

### Problem
`getNextThursday()` i OperatorDashboard beregner altid næste ugentlige torsdag, uden hensyn til lejertype. Lite-lejere skal sendes den **første torsdag i måneden**, ikke næste torsdag. Brugersiden bruger korrekt `getNextShippingDateForItem()` som håndterer dette.

### Ændring i `src/pages/OperatorDashboard.tsx`

1. **Tilføj `getFirstThursdayOfMonth` og `getShippingDate(tenantTypeName, mailType)` funktioner** — samme logik som i ShippingPrepPage:
   - Pakker og Standard/Plus → næste torsdag (inkl. i dag hvis torsdag)
   - Lite breve → første torsdag i måneden (eller næste måned hvis passeret)

2. **Opdater `getOperatorStatusDisplay`** — erstat `getNextThursday()` med `getShippingDate()` der tager tenant type i betragtning:
   - Linje 72-74: Når `chosen_action === "send"`, brug tenant type info
   - Linje 97-99: Når `defaultAction === "send"`, brug tenant type info

3. **Fix `getNextThursday`** — den nuværende implementation springer altid til næste uge selv hvis i dag er torsdag. Skal inkludere i dag hvis det er torsdag (som ShippingPrepPage gør).

### Fil
`src/pages/OperatorDashboard.tsx`

