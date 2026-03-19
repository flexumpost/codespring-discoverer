

## Fix: Plus brev forsendelse — gebyr skal være "0 kr." uden porto

### Problem
For Plus-lejere vises brev-forsendelse som "0 kr. + porto" på både lejer- og operatør-dashboardet. Plus-lejere skal have gratis porto på breve, så gebyret skal blot være "0 kr.".

### Ændringer

**1. `src/pages/TenantDashboard.tsx`**

- Linje 198: Ændr `return "0 kr. + porto"` → `return "0 kr."` (i `getFeeDisplay`, Plus brev `chosen_action === "send"`)
- Linje 238: Ændr `return "0 kr. + porto"` → `return "0 kr."` (i `getFeeForAction`, Plus brev `action === "send"`)

**2. `src/pages/OperatorDashboard.tsx`**

- Linje 401: Ændr `return "0 kr. + porto"` → `return "0 kr."` (Plus brev send, inden for default-action blok)
- Linje 426: Ændr `return "0 kr. + porto"` → `return "0 kr."` (Plus brev send/forsendelse, non-default)

Begge steder rammes kun Plus-lejere med brev — pakke-logikken (som korrekt viser "10 kr. - Gratis porto") er uberørt.

