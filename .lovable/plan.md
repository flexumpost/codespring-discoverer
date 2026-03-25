

## Rettelse: Lite-lejere betaler 0 kr. + porto ved standardforsendelse

### Problem
Den nuværende fallback-logik for breve (når `chosen_action` er null og standardhandlingen er `send`) returnerer "50 kr. + porto" for Lite-lejere. Men dette er forkert — fallback-casen repræsenterer netop **standardforsendelsesdagen** (første torsdag i måneden for Lite), som er gratis. De 50 kr. gælder kun ved **ekstra forsendelse** (andre torsdage), som håndteres af den eksplicitte `chosen_action`-logik.

### Ændringer

**Begge filer:**

**`src/pages/OperatorDashboard.tsx`** (linje 279-283) og **`src/pages/ShippingPrepPage.tsx`** (linje 132-136):

Ændr Lite-linjen fra `"50 kr. + porto"` til `"0 kr. + porto"`:

```typescript
// Fra:
if (tier === "Lite") return "50 kr. + porto";
if (tier === "Standard") return "0 kr. + porto";

// Til:
if (tier === "Lite") return "0 kr. + porto";
if (tier === "Standard") return "0 kr. + porto";
```

Alternativt kan de to linjer slås sammen til én:
```typescript
if (tier === "Lite" || tier === "Standard") return "0 kr. + porto";
```

Logikken er korrekt fordi: når `chosen_action` er null og standardhandlingen er `send`, betyder det at brevet sendes på den inkluderede forsendelsesdag — altså gratis (+ porto) for både Lite og Standard.

