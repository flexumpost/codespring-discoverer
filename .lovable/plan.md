

## Fix: Standard brev "Forsendelse" gebyr skal være "0 kr. + porto"

### Problem
For Standard-lejere med breve vises gebyret for "Forsendelse" som "30 kr. + porto" (begge dashboards). Da forsendelse er inkluderet i Standard-abonnementet, skal gebyret være **"0 kr. + porto"**.

### Ændringer

**1. `src/pages/TenantDashboard.tsx`**

- **`getDisplayFee` (linje 210-213)**: Når `chosenAction === "send"` og `tenantTypeName === "Standard"`, returner `"0 kr. + porto"` i stedet for `"—"`.
- **`getActionPrice` (linje 250-255)**: Tilføj `if (action === "send") return "0 kr. + porto";` for Standard-breve, så dropdown-prisen også vises korrekt.

**2. `src/pages/OperatorDashboard.tsx`**

- **`getItemFee` (linje 366-370)**: Når `chosen_action === "send"` og `defaultAction === "send"` for Standard brev, returner `"0 kr. + porto"` (allerede dækket af linje 371 `return "0 kr."` — men linje 366-368 fanger det først og returnerer forkert). Ret Standard-casen til `"0 kr. + porto"`.
- **`getItemFee` (linje 391-394)**: Når `chosen_action === "send"` for Standard brev (non-default), returner `"0 kr. + porto"` i stedet for `"30 kr. + porto"`.

### Opsummering
Alle steder hvor Standard + brev + forsendelse (`send`) beregner gebyr, ændres til "0 kr. + porto".

