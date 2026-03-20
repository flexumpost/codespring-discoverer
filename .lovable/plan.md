

## Tilføj procentdel og afstand til lejertype-badges

### Ændring

**`src/pages/TenantsPage.tsx`**

1. **Beregn procentdel** i badge-renderingen: `total = Lite + Standard + Plus`, vis `(XX%)` efter antallet.

2. **Tilføj `mb-[10px]`** på badge-containeren for 10px afstand til tabellen.

```typescript
// Linje 246-252 ændres til:
<div className="flex items-center gap-3 mb-[10px]">
  {(["Lite", "Standard", "Plus"] as const).map((type) => {
    const total = typeCounts.Lite + typeCounts.Standard + typeCounts.Plus;
    const pct = total > 0 ? Math.round((typeCounts[type] / total) * 100) : 0;
    return (
      <Badge key={type} variant="outline" className={`${TYPE_COLORS[type]} text-xs`}>
        {type}: {typeCounts[type]} ({pct}%)
      </Badge>
    );
  })}
</div>
```

