

## Tilføj "c/o" prefix til shippingCo-visning

### Ændring

**`src/pages/ShippingPrepPage.tsx`** — linje ~383 hvor `group.shippingCo` vises:

Tilføj logik der tjekker om værdien allerede starter med "c/o" (case-insensitive). Hvis ikke, prefix med "c/o ":

```typescript
const formatCo = (val: string) => val.match(/^c\/o\s/i) ? val : `c/o ${val}`;
```

Anvendes både i visning og i copy-funktionen for c/o-linjen.

| Fil | Handling |
|---|---|
| `src/pages/ShippingPrepPage.tsx` | Tilføj `formatCo` helper og brug den i c/o visning + kopi |

