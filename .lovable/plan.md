

## Vis alle forsendelser når intet kort er valgt

### Ændring

**`src/pages/OperatorDashboard.tsx`**

Når `selectedCard` er `null`, vises alle forsendelser i tabellen i stedet for en tom visning. Listen sorteres efter `stamp_number` (forsendelsesnr.).

Konkret:
- Ændr `filteredItems` logikken: hvis intet kort er valgt, brug alle `mailItems` i stedet for en tom liste
- Sortér `filteredItems` efter `stamp_number` (numerisk/alfabetisk, med tomme værdier sidst)
- Vis tabellen altid (med overskriften "Alle forsendelser" når intet kort er valgt, ellers kortets titel)
- Fjern betingelsen `selectedCard && activeFilter` fra tabelvisningen, så tabellen altid renderes

### Teknisk detalje

```text
const filteredItems = activeFilter
  ? mailItems.filter(activeFilter.filter)
  : mailItems;

const sortedItems = [...filteredItems].sort((a, b) => {
  if (!a.stamp_number) return 1;
  if (!b.stamp_number) return -1;
  return a.stamp_number.localeCompare(b.stamp_number, "da-DK", { numeric: true });
});
```

Kun én fil ændres: `src/pages/OperatorDashboard.tsx`

