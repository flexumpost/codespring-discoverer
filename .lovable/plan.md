

## Fix: Standard afhentning gebyr skal være 30 kr., ikke 50 kr.

### Problem
Standard-lejere får vist "50 kr." for ekstra afhentning i stedet for "30 kr." på begge dashboards.

### Ændringer

**`src/pages/TenantDashboard.tsx`** — 3 steder:

1. **Linje 121** — `getItemFee` default-action branch: `return "50 kr."` → skal tjekke tier og returnere "30 kr." for Standard
2. **Linje 143** — `getItemFee` ekstra-handling branch: `return tenantTypeName === "Standard" ? "50 kr." : extraPrice` → ændres til `"30 kr."`
3. **Linje 161** — `getActionPrice`: `return "50 kr."` → ændres til `"30 kr."`

**`src/pages/OperatorDashboard.tsx`** — 1 sted:

4. **Linje 244** — `getItemFee`: `return "50 kr."` → skal tjekke tier og returnere "30 kr." for Standard

