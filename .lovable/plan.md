

## Tilføj "Gebyr" kolonne på lejer-dashboardet

### Hvad
En ny kolonne "Gebyr" indsættes i tabellen på lejer-dashboardet, placeret lige efter "Annuller handling"-kolonnen (før "Scan").

### Logik
- Hvis brugeren har valgt en **ekstra handling** (`chosen_action` er sat, og den afviger fra standard-handlingen), vises gebyret fra `getExtraHandlingPrice()` (Lite: 50 kr., Standard: 30 kr., Plus: gratis/ingen gebyr).
- Hvis ingen ekstra handling er valgt, eller handlingen matcher standarden, vises "—".

### Ændringer i `src/pages/TenantDashboard.tsx`

1. **Linje 566-567** — tilføj `<TableHead>Gebyr</TableHead>` efter "Annuller handling":
```
<TableHead>Annuller handling</TableHead>
<TableHead>Gebyr</TableHead>
<TableHead>Scan</TableHead>
```

2. **Linje 694-695** — tilføj `<TableCell>` med gebyr-logik efter annuller-knappen:
```tsx
<TableCell>
  {(() => {
    if (!item.chosen_action) return <span className="text-muted-foreground">—</span>;
    const defaultAction = item.mail_type === "pakke"
      ? selectedTenant?.default_package_action
      : selectedTenant?.default_mail_action;
    if (item.chosen_action === defaultAction) return <span className="text-muted-foreground">—</span>;
    const price = getExtraHandlingPrice(tenantTypeName);
    return price
      ? <span className="text-sm font-medium">{price}</span>
      : <span className="text-muted-foreground text-xs">Gratis</span>;
  })()}
</TableCell>
```

Én fil berørt, ingen backend-ændringer.

