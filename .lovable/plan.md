

## Fix: Plus-pakke afhentningsgebyr viser "Inkluderet" i stedet for "10 kr."

### Problem
`PACKAGE_PRICING_DEFAULTS["Plus"].haandteringsgebyr` er sat til `"Inkluderet"`. Når en Plus-pakke har valgt "afhentning", bruges denne default og viser "Inkluderet" i stedet for "10 kr.".

### Ændringer i `src/pages/OperatorDashboard.tsx`

**1. Linje 266** — Ret Plus default:
```typescript
Plus: { haandteringsgebyr: "10 kr." },
```

**2. Linje 291-295** — Erstat den generiske pakke-logik med tier-specifik differentiering mellem afhentning og forsendelse:
```typescript
if (item.mail_type === "pakke") {
  if (item.chosen_action === "destruer") return "0 kr.";
  const tier2 = item.tenants?.tenant_types?.name;
  if (item.chosen_action === "afhentning") {
    if (tier2 === "Plus") return "10 kr.";
    if (tier2 === "Standard") return "30 kr.";
    return "50 kr.";
  }
  // forsendelse
  if (tier2 === "Plus") return "10 kr. + porto";
  if (tier2 === "Standard") return "30 kr. + porto";
  return "50 kr. + porto";
}
```

### Fil
- `src/pages/OperatorDashboard.tsx`

