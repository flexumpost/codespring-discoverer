

## Fix: Plus-lejer — manglende dato og gebyr på operatør-dashboard

### Problem
For Plus-lejere med standardhandling "Afhentning" vises:
- **Status**: "Afhentning (standard)" uden dato — skal vise næste torsdag
- **Gebyr**: "—" i stedet for "0 kr." (brev) og "10 kr." (pakke)

### Ændringer

**`src/pages/OperatorDashboard.tsx`**

#### 1. Status med dato (linje 199)
Ændre `"Afhentning (standard)"` til at inkludere næste torsdag:

```typescript
if (defaultAction === "afhentning") {
  const shipDate = getShippingDate(item.tenants?.tenant_types?.name, item.mail_type);
  return `Afhentning (standard) ${formatDanishDate(shipDate)}`;
}
```

#### 2. Gebyr for default-handling uden chosen_action (linje 322)
Udvid den tidlige return på linje 322 til at beregne gebyr baseret på standardhandlingen, når `chosen_action` er null:

```typescript
if (!item.chosen_action) {
  if (!item.tenant_id) return "—";
  const tier = item.tenants?.tenant_types?.name;
  const defaultAction = item.mail_type === "pakke"
    ? item.tenants?.default_package_action
    : item.tenants?.default_mail_action;
  if (!defaultAction) return "—";
  
  if (item.mail_type === "pakke") {
    if (defaultAction === "afhentning") {
      if (tier === "Plus") return "10 kr.";
      if (tier === "Standard") return "30 kr.";
      return "50 kr.";
    }
    if (defaultAction === "send") {
      if (tier === "Plus") return "10 kr. + porto";
      if (tier === "Standard") return "30 kr. + porto";
      return "50 kr. + porto";
    }
    if (defaultAction === "destruer") return "0 kr.";
    return "—";
  }
  // Brev default — always included in subscription
  if (defaultAction === "scan" && tier === "Standard") return "0 kr.";
  return "0 kr.";
}
```

Dette sikrer at standardhandlinger viser korrekt gebyr: Plus brev afhentning = "0 kr.", Plus pakke afhentning = "10 kr.".

