

## Problem

`ShippingPrepPage` bruger `getNextShippingDateForItem()` til at beregne forsendelsesdatoen for alle emner — også Lite-breve med "Ekstra forsendelse". For et Lite-brev returnerer funktionen **første torsdag i måneden** (2. april), men "Ekstra forsendelse" (`chosen_action: "send"`) skal sendes **førstkommende torsdag** (12. marts). Derfor matcher emnet ikke den valgte dato og vises ikke.

## Løsning

I `filteredItems` (linje 136-143): Når et Lite-brev har `chosen_action === "send"`, beregn forsendelsesdatoen som førstkommende torsdag i stedet for den tier-specifikke dato.

**`src/pages/ShippingPrepPage.tsx`**, linje 138-141:

```typescript
// Før:
return items.filter((item) => {
  if (item.mail_type !== tab) return false;
  const shipDate = getNextShippingDateForItem(item.tenant_type_name, item.mail_type);
  return shipDate.getTime() === selDay;
});

// Efter:
return items.filter((item) => {
  if (item.mail_type !== tab) return false;
  // "Ekstra forsendelse" for Lite-breve: brug førstkommende torsdag
  const isExtraShipment =
    item.chosen_action === "send" &&
    item.tenant_type_name.toLowerCase() === "lite" &&
    item.mail_type === "brev";
  const shipDate = isExtraShipment
    ? (isThursday(startOfDay(new Date())) ? startOfDay(new Date()) : startOfDay(nextThursday(new Date())))
    : getNextShippingDateForItem(item.tenant_type_name, item.mail_type);
  return shipDate.getTime() === selDay;
});
```

En enkelt ændring i filtreringslogikken. Ingen andre filer berørt.

