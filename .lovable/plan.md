

## Fix: Edge function genkender ikke operator-handlingsnavne

### Problem
Når operatøren behandler post, sætter UI'et `chosen_action` til operatør-specifikke værdier:
- **Sendt**: `chosen_action = "under_forsendelse"` (UI forventer `"send"`)
- **Afhentet**: `chosen_action = "afhentet"` (UI forventer `"afhentning"`)

Edge-funktionens `calculateFee` matcher kun lejer-valgte navne (`"send"`, `"forsendelse"`, `"afhentning"`), så operatør-navnene falder igennem til 0 kr.

### Løsning
Tilføj normalisering i edge-funktionens `calculateFee` funktion, så operatør-handlingsnavne mappes til deres gebyr-ækvivalente:

```
under_forsendelse → send
afhentet → afhentning
```

### Ændring
**1 fil**: `supabase/functions/sync-officernd-charge/index.ts`

Tilføj normalisering af `chosenAction` i starten af `calculateFee`:
```typescript
// Normalize operator action names to fee-equivalent names
if (chosenAction === "under_forsendelse") chosenAction = "send";
if (chosenAction === "afhentet") chosenAction = "afhentning";
```

Ingen database-ændringer nødvendige — triggeren fungerer korrekt. Problemet er udelukkende i edge-funktionens gebyrberegning.

