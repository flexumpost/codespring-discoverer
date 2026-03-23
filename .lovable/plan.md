

## Fix gebyrberegning på "Send breve og pakker" siden

### Problem
`getShippingFee()` i ShippingPrepPage.tsx bruger kun `chosen_action` til at beregne gebyret, men ignorerer `default_mail_action` og `default_package_action`. Når en Lite-lejer har `default_mail_action = "standard_forsendelse"` og `chosen_action = null`, falder logikken igennem til tier-baseret pris (50 kr. + porto) i stedet for at genkende det som standard forsendelse (0 kr. + porto).

TenantDashboard bruger `chosenAction || defaultAction` korrekt, men ShippingPrepPage gør det ikke.

### Ændring

**`src/pages/ShippingPrepPage.tsx` — `getShippingFee` funktionen (linje 109-124)**

Erstat den simple funktion med logik der matcher TenantDashboard:

```typescript
function getShippingFee(item: MailItemWithTenant): string {
  const tier = item.tenant_type_name;
  const defaultAction = item.mail_type === "pakke"
    ? item.default_package_action
    : item.default_mail_action;
  const effective = item.chosen_action || defaultAction;

  if (item.mail_type === "pakke") {
    if (effective === "destruer") return "0 kr.";
    if (tier === "Plus") return "10 kr. - Gratis porto";
    if (tier === "Standard") return "30 kr. + porto";
    return "50 kr. + porto";
  }

  // Breve
  if (effective === "destruer") return "0 kr.";
  if (tier === "Plus") return "0 kr.";
  if (tier === "Standard") {
    if (effective === "send") return "0 kr. + porto";
    return "0 kr. + porto";
  }
  // Lite
  if (effective === "standard_forsendelse") return "0 kr. + porto";
  if (effective === "send") return "50 kr. + porto";
  // Fallback: standard forsendelse for Lite
  return "0 kr. + porto";
}
```

Nøgleforskelle fra nuværende kode:
- Bruger `effective = chosen_action || default_action` i stedet for kun `chosen_action`
- Matcher Plus-pakke format: "10 kr. - Gratis porto" (som TenantDashboard)
- Håndterer destruer-handlingen (0 kr.)
- Standard forsendelse for Lite korrekt identificeret som "0 kr. + porto"

