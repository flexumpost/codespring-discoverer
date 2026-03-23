

## Fix: Plus-pakker viser fejlagtigt "Gratis porto"

### Problem
I `TenantDashboard.tsx` har Plus-pakker prisvisningen `"10 kr. - Gratis porto"` for forsendelse. Dette er forkert — gratis porto gælder kun for Plus-lejeres **breve**, ikke pakker. Pakker skal altid vise `"10 kr. + porto"`.

### Ændring

**`src/pages/TenantDashboard.tsx`** — To steder (linje 174 og linje 231):

Ændr begge forekomster af:
```typescript
Plus: { fee: "10 kr.", feePorto: "10 kr. - Gratis porto" },
```
Til:
```typescript
Plus: { fee: "10 kr.", feePorto: "10 kr. + porto" },
```

Dette retter prisvisningen i både gebyr-kolonnen og dropdown-menuen for pakkehandlinger.

