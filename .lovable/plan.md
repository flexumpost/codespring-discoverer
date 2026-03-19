

## Fix: "Ekstra forsendelse" viser 0 kr. i stedet for 50 kr. for Lite breve

### Årsag

I `getItemFee` (linje 171-172) tjekker koden om `chosenAction === defaultAction`. Når lejerens standardhandling er `"send"` og brugeren vælger "Ekstra forsendelse" (også `"send"`), behandles det som "ingen ændring" → gebyret bliver "0 kr. + porto" i stedet for "50 kr. + porto".

### Løsning

Tilføj en ekstra undtagelse i betingelsen på linje 171-172, så Lite-lejere med `chosenAction === "send"` og `defaultAction === "send"` **ikke** falder ind i gratis-grenen:

**`src/pages/TenantDashboard.tsx` linje 171-172:**
```typescript
if (!chosenAction || (chosenAction === defaultAction &&
    !(chosenAction === "scan" && defaultAction === "scan" && tenantTypeName === "Lite") &&
    !(chosenAction === "send" && defaultAction === "send" && tenantTypeName === "Lite"))) {
```

Dette sikrer at koden når ned til linje 197-200, som korrekt returnerer "50 kr. + porto" for Lite.

### Ingen andre ændringer
Labels, rækkefølge og øvrig gebyr-logik er uændret.

