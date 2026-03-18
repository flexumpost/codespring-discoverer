

## Problem

When a tenant's `default_mail_action` is `"scan"` (e.g. Lite tenants with standard scanning), their mail items have `chosen_action = null`. Three places in `OperatorDashboard.tsx` only check `chosen_action === "scan" || chosen_action === "standard_scan"`, so these items:

1. Don't appear under the "Åben og scan" card filter
2. Don't show the "Upload scan" button
3. Don't support inline drag-and-drop scan upload

The status text (`getOperatorStatusDisplay`) correctly handles this case (lines 160-181), but the filter and UI conditions don't.

## Plan

**File: `src/pages/OperatorDashboard.tsx`**

Create a helper function to determine if an item needs scanning:

```typescript
function itemNeedsScan(item: MailItem): boolean {
  if (item.chosen_action === "scan" || item.chosen_action === "standard_scan") return true;
  // Default action is scan and no explicit action chosen
  if (!item.chosen_action) {
    const defaultAction = item.mail_type === "pakke"
      ? item.tenants?.default_package_action
      : item.tenants?.default_mail_action;
    if (defaultAction === "scan") return true;
  }
  return false;
}
```

Then update three locations:

1. **"Åben og scan" card filter** (line ~230): use `itemNeedsScan(item)` in both `filter` and `countFilter`
2. **Scan upload button condition** (line ~646): replace `(item.chosen_action === "scan" || item.chosen_action === "standard_scan")` with `itemNeedsScan(item)`
3. **Inline drag-drop condition** (line ~559): same replacement for `canDropScan`

### Files changed
- `src/pages/OperatorDashboard.tsx`

