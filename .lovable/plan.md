

## Fix: Dropdown "Vælg handling" altid tom som default

### Problem
Dropdownen viser den gemte `chosen_action` fordi `value` sættes til `item.chosen_action` når den matcher en tilgængelig extra-handling. Brugeren ønsker at dropdown altid er tom (viser placeholder).

### Løsning
Ændr `Select`-komponenten fra kontrolleret (`value=...`) til ukontrolleret ved at fjerne `value`-prop'en helt. Dropdown vil altid vise placeholder-teksten "Ekstra handling", og `onValueChange` håndterer stadig valg korrekt.

**`src/pages/TenantDashboard.tsx`**, linje 576-577:

```tsx
// Før:
<Select
  value={availableExtras.includes(item.chosen_action ?? "") ? item.chosen_action! : undefined}
  onValueChange={(value) => handleAction(item.id, value)}

// Efter:
<Select
  value=""
  onValueChange={(value) => handleAction(item.id, value)}
```

Ved at sætte `value=""` (tom streng som ikke matcher nogen SelectItem-value) vil Radix Select altid vise placeholder-teksten.

