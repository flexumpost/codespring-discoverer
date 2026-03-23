

## Overfør gebyrlogik fra operatør-dashboard til forsendelsessiden

### Tilgang
Ja, det er den nemmeste løsning. Operatør-dashboardets `getItemFee()` (linje 340-450) har den korrekte logik. Vi tilpasser den til ShippingPrepPage's flade datastruktur (`item.tenant_type_name` i stedet for `item.tenants?.tenant_types?.name`).

### Ændring

**`src/pages/ShippingPrepPage.tsx` — erstat `getShippingFee` (linje 109-131)**

Kopier logikken fra OperatorDashboard's `getItemFee`, tilpasset til den flade type:

```typescript
function getShippingFee(item: MailItemWithTenant): string {
  const tier = item.tenant_type_name;
  const defaultAction = item.mail_type === "pakke"
    ? item.default_package_action
    : item.default_mail_action;

  if (!item.chosen_action) {
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
    return "0 kr.";
  }

  if (item.chosen_action === "standard_forsendelse") {
    if (item.mail_type === "pakke") {
      if (tier === "Plus") return "10 kr. + porto";
      if (tier === "Standard") return "30 kr. + porto";
      return "50 kr. + porto";
    }
    return "0 kr. + porto";
  }
  if (item.chosen_action === "standard_scan") return "0 kr.";
  if (item.chosen_action === "gratis_afhentning") return "0 kr.";
  if (!tier) return "—";

  if (item.mail_type === "pakke") {
    if (item.chosen_action === "destruer") return "0 kr.";
    if (item.chosen_action === "afhentning") {
      if (tier === "Plus") return "10 kr.";
      if (tier === "Standard") return "30 kr.";
      return "50 kr.";
    }
    if (tier === "Plus") return "10 kr. + porto";
    if (tier === "Standard") return "30 kr. + porto";
    return "50 kr. + porto";
  }

  // Brev: tjek om handlingen er default
  if (item.chosen_action === defaultAction) {
    if (item.chosen_action === "send" || item.chosen_action === "forsendelse") {
      if (tier === "Lite") return "50 kr. + porto";
      if (tier === "Standard") return "0 kr. + porto";
      return "0 kr.";
    }
    return "0 kr.";
  }

  if (item.chosen_action === "send" || item.chosen_action === "forsendelse") {
    if (tier === "Lite") return "50 kr. + porto";
    if (tier === "Standard") return "0 kr. + porto";
    return "0 kr.";
  }

  return "0 kr.";
}
```

Dette er en direkte overførsel af den fungerende logik fra operatør-dashboardet, tilpasset ShippingPrepPage's flade datastruktur.

