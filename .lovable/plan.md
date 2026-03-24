

## Fee Calculation Consistency Audit

### Expected Pricing Rules (Mail/Brev)

| Action | Lite | Standard | Plus |
|---|---|---|---|
| **scan** (scan nu, 24h) | 50 kr. | 30 kr. | 0 kr. |
| **standard_scan** (scheduled free) | 0 kr. | 0 kr. | 0 kr. |
| **send** (explicit) | 50 kr. + porto | 0 kr. + porto | 0 kr. |
| **standard_forsendelse** (scheduled free) | 0 kr. + porto | 0 kr. + porto | 0 kr. + porto |
| **afhentning** (on free day) | 0 kr. | 0 kr. | 0 kr. |
| **afhentning** (not free day) | 50 kr. | 30 kr. | 0 kr. |
| **gratis_afhentning** | 0 kr. | 0 kr. | 0 kr. |
| **destruer** | 0 kr. | 0 kr. | 0 kr. |

Package pricing is consistent across all three files (10/30/50 kr. + porto for send, without porto for pickup). No changes needed there.

---

### Bugs Found

**1. ShippingPrepPage — missing scan pricing (line 159-165)**
When `chosen_action = "scan"` and it equals `defaultAction`, returns `"0 kr."` for all tiers. Should return 50/30/0 kr.

**2. ShippingPrepPage — missing afhentning + scan pricing (line 174)**
Catch-all `return "0 kr."` when chosen !== default and action is not send. Missing scan (50/30/0) and afhentning (pickup-date-based) pricing.

**3. TenantDashboard — Standard scan undercharged (line 187-188)**
The exception condition only covers `Lite` + scan, not `Standard` + scan. So Standard tenant with `default=scan` who chooses "scan" gets `"0 kr."` instead of `"30 kr."`.

**4. TenantDashboard — Plus send shows porto (line 196)**
When `chosen=send` matches `default=send`, Plus falls into the generic `"0 kr. + porto"` instead of `"0 kr."` (Plus gets free porto on mail).

### Fix Plan

**File: `src/pages/ShippingPrepPage.tsx`**
- Add scan pricing in the `chosen === default` block (after send check, before `return "0 kr."`)
- Add scan and afhentning pricing in the non-default block (before catch-all `return "0 kr."`)

**File: `src/pages/TenantDashboard.tsx`**
- Extend the exception on line 188 to also cover Standard+scan: `!(chosenAction === "scan" && defaultAction === "scan" && (tenantTypeName === "Lite" || tenantTypeName === "Standard"))`
- Add Plus check before `return "0 kr. + porto"` on line 196 to return `"0 kr."` for Plus send

**No changes needed for OperatorDashboard** — the recent scan fix made it correct.

