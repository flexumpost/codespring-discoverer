

## Fjern "(Skal bookes)" fra ekstra scanning

### Ændring

**`src/components/PricingOverview.tsx`** — linje 28, 35, 42

Fjern `(Skal bookes)` fra `ekstraScanning`-værdien i alle tre pakker:

- Lite: `"50 kr. (Skal bookes)"` → `"50 kr."`
- Standard: `"30 kr. (Skal bookes)"` → `"30 kr."`
- Plus: `"0 kr. (Skal bookes)"` → `"0 kr."`

`ekstraAfhentning` beholder `(Skal bookes)` da det kun er scanning der skal ændres.

| Fil | Ændring |
|---|---|
| `src/components/PricingOverview.tsx` | Fjern "(Skal bookes)" fra 3 ekstraScanning-værdier |

