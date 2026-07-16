## Problem

Forsendelse 3568 vises til scanning d. 23. juli i stedet for i dag d. 16. juli, fordi `getNextThursday()` bruger:

```ts
const daysUntil = (4 - dayOfWeek + 7) % 7 || 7;
```

Når i dag *er* torsdag bliver `daysUntil` = 0, og `|| 7` tvinger springet til **næste** torsdag. Alle datovisninger på operator- og lejer-dashboard viser derfor "på torsdag = næste uge" i stedet for i dag.

Bemærk: `ShippingPrepPage.tsx` (linje 35, 52) bruger allerede den korrekte variant *uden* `|| 7`, så dispatch-siden behandler allerede torsdag-i-dag som gyldig afsendelsesdag — det er kun visningerne der er ude af trit.

## Løsning

Fjern `|| 7` i alle `getNextThursday()`-varianter, så torsdag-i-dag returneres som "næste torsdag". Ingen ny cut-off tid — operatoren beslutter selv i løbet af dagen om posten når med, og action-lock-logikken i `ShippingPrepPage` bruger allerede samme logik.

### Filer der ændres

1. **`src/lib/mailActions.ts`** (linje 24-30)
   - Ret `getNextThursday()`: `(4 - dayOfWeek + 7) % 7 || 7` → `(4 - dayOfWeek + 7) % 7`

2. **`src/pages/OperatorDashboard.tsx`** (linje 48-53)
   - Samme rettelse i den lokale `getNextThursday()`.

3. **`src/pages/TenantDashboard.tsx`** (linje 292-298)
   - Samme rettelse i den lokale `getNextThursday()`.

4. **`src/pages/TenantsPage.tsx`** (linje 378-379)
   - Inline-udregning: fjern `|| 7`.

Ingen ændringer i database, edge functions, action-locking, e-mailskabeloner eller forretningsregler. Kun visningsdatoer opdateres, så torsdag-i-dag = i dag i stedet for +7 dage.

### Konsekvens for 3568

Efter rettelsen vil 3568 vises som "Scanning bestilt 16. juli" i dag (torsdag). Fra og med fredag rykkes den automatisk til torsdag d. 23. juli som forventet.
