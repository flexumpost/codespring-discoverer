

## Detaljeret gebyrlogik for Gebyr-kolonnen og ekstra handling-dropdown

### Problem
Den nuværende `getExtraHandlingPrice()` returnerer en fast pris pr. tier (50/30/gratis). Den tager ikke højde for:
- Standard handling skal altid vise "0 kr." eller "0 kr. + porto"
- Afhentning-gebyret afhænger af det valgte tidspunkt (gratis hvis det falder på en "standard torsdag")
- Dropdown-priserne viser forkerte beløb for visse handlinger
- Plus viser "Gratis" i stedet for "0 kr."

### Løsning
Erstat `getExtraHandlingPrice()` med en ny funktion `getItemFee()` der tager tier, handling og pickup-dato i betragtning.

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Ny funktion `getItemFee()`** (erstatter `getExtraHandlingPrice` i Gebyr-kolonnen):

```typescript
function getItemFee(
  tenantTypeName: string | undefined,
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  notes: string | null
): string {
  // Ingen handling valgt = standard handling
  if (!chosenAction || chosenAction === defaultAction) {
    if (defaultAction === "send") return "0 kr. + porto";
    return "0 kr.";
  }
  // Plus: alt er gratis
  if (tenantTypeName === "Plus") {
    if (chosenAction === "send") return "0 kr. + porto";
    return "0 kr.";
  }
  // Ekstra handling priser
  const extraPrice = tenantTypeName === "Lite" ? "50 kr." : "30 kr.";
  if (chosenAction === "scan") return extraPrice;
  if (chosenAction === "send") return extraPrice === "50 kr." ? "50 kr. + porto" : "—"; // Standard har ikke "send hurtigst muligt"
  if (chosenAction === "afhentning") {
    // Tjek om pickup-dato er en gratis torsdag
    const pickupDate = parsePickupDateFromNotes(notes);
    if (pickupDate && isFreeTorsdag(pickupDate, tenantTypeName)) return "0 kr.";
    return extraPrice;
  }
  return "—";
}
```

Hjælpefunktioner:
- `parsePickupDateFromNotes(notes)`: parser PICKUP:iso fra notes til Date
- `isFreeTorsdag(date, tier)`: Lite = er datoen den første torsdag i måneden? Standard = er datoen en torsdag?

**2. Gebyr-kolonne** — brug `getItemFee()` i stedet for den nuværende logik.

**3. Dropdown-priser** — brug en ny `getActionPrice()` funktion der returnerer den korrekte pris pr. handling til visning i dropdown:

| Tier | Scan nu | Send | Afhentning |
|------|---------|------|------------|
| Lite | 50 kr. | 50 kr. + porto | 50 kr. |
| Standard | 30 kr. | — (ikke tilgængelig) | 50 kr. |
| Plus | 0 kr. | 0 kr. | 0 kr. |

**4. Fjern `getExtraHandlingPrice()`** — den erstattes af de nye funktioner.

### Fil-ændringer
Kun `src/pages/TenantDashboard.tsx` berøres.

