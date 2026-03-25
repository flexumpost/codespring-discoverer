

## Problem

When a mail item is locked (e.g., scheduled for shipping tomorrow), the operator can only finalize it (mark as sent, picked up, destroyed, etc.). There's no way for the operator to **change the action** to scan or pickup if the tenant requests it by email — the operator would need to reject the action first and then have the tenant re-select, which isn't possible when the item is locked.

## Solution

Add a new "Change action" section in the OperatorMailItemDialog that allows the operator to reassign the `chosen_action` to `scan` or `afhentning` without finalizing the item. This is separate from the existing "Operator actions" (which mark items as completed).

### Changes

**1. `src/components/OperatorMailItemDialog.tsx`**
- Add a new section above the existing "Operator actions" block, visible when the item is not finalized and has a `chosen_action` set (or effective action via default).
- Show a dropdown with options: "Scanning" and "Afhentning".
- On confirm, update `chosen_action` to the selected value and reset status to `afventer_handling`.
- This allows the operator to override a locked shipping action to scan or pickup per tenant request.

**2. `src/i18n/locales/da.json`** — Add translations:
- `operatorMailItem.changeAction`: "Ændr handling"
- `operatorMailItem.changeActionDesc`: "Ændr den valgte handling for denne forsendelse"
- `operatorMailItem.changeToScan`: "Ændr til scanning"
- `operatorMailItem.changeToPickup`: "Ændr til afhentning"
- `operatorMailItem.actionChanged`: "Handling ændret"

**3. `src/i18n/locales/en.json`** — Corresponding English translations.

### How it works
- Operator opens the mail item dialog for a locked item (e.g., 2893 with shipping scheduled).
- A new "Change action" section appears with options to switch to "Scanning" or "Afhentning".
- Selecting one updates `chosen_action` and resets status, unlocking the item from the shipping pipeline.
- The tenant's lock rules remain unchanged — tenants still cannot modify locked items in the app.

