

## Tilføj gebyr-visning på forsendelseslinjer i ShippingPrepPage

### Problem
På "Send breve og pakker" siden viser hver forsendelseslinje kun `Nr. X — Firmanavn`. Der mangler gebyr-information.

### Ændring

**`src/pages/ShippingPrepPage.tsx`**

1. Tilføj en `getShippingFee` funktion der beregner gebyret baseret på samme logik som OperatorDashboard:
   - **Breve**: `chosen_action === "send"` (ekstra forsendelse) → tier-baseret gebyr + porto. `chosen_action === "standard_forsendelse"` → "0 kr. + porto".
   - **Pakker**: Tier-baseret håndteringsgebyr + porto (Plus: 10 kr., Standard: 30 kr., Lite: 50 kr.).

2. Opdater linje 347-349 til at vise gebyret:
```typescript
<span className="text-sm font-medium">
  Nr. {item.stamp_number ?? "—"} — {item.company_name} — Gebyr: {getShippingFee(item)}
</span>
```

### Gebyr-logik

```typescript
function getShippingFee(item: MailItemWithTenant): string {
  const tier = item.tenant_type_name;

  if (item.mail_type === "pakke") {
    if (tier === "Plus") return "10 kr. + porto";
    if (tier === "Standard") return "30 kr. + porto";
    return "50 kr. + porto";
  }

  // Breve
  if (item.chosen_action === "standard_forsendelse") return "0 kr. + porto";
  // "send" = ekstra forsendelse
  if (tier === "Lite") return "50 kr. + porto";
  if (tier === "Standard") return "30 kr. + porto";
  return "0 kr. + porto"; // Plus
}
```

### Fil
- `src/pages/ShippingPrepPage.tsx`

