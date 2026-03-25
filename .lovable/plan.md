

## Problem

`getMailRowColor()` only considers `item.chosen_action` when determining row color. Items that rely on the tenant's **default action** (e.g., `default_mail_action = "scan"`) have `chosen_action = null`, so they fall through to the yellow "Ny/afventer" catch-all — even though they should show as "Bestilt scanning" (blue).

This affects items 2908, 2892, etc. that display "Standard scanning..." but appear yellow instead of blue.

## Fix

**File: `src/lib/mailRowColor.ts`** — Add an optional `effectiveAction` parameter that callers can pass (computed from `chosen_action ?? default action`). When `chosen_action` is null, the function will use `effectiveAction` for color determination.

Update the function signature:
```typescript
export function getMailRowColor(item: {
  status: MailStatus;
  chosen_action: string | null;
  scan_url: string | null;
  tenant_id: string | null;
  effectiveAction?: string | null;  // NEW: chosen_action ?? default action
}): string
```

Replace all `item.chosen_action` references in the scan/send/pickup checks with `item.effectiveAction ?? item.chosen_action` so that default actions are considered.

**File: `src/pages/OperatorDashboard.tsx`** — Compute `effectiveAction` before passing item to `getMailRowColor`:
```typescript
const effectiveAction = item.chosen_action 
  ?? (item.mail_type === "pakke" ? item.tenants?.default_package_action : item.tenants?.default_mail_action) 
  ?? null;
getMailRowColor({ ...item, effectiveAction })
```

**File: `src/pages/TenantDashboard.tsx`** — Same change: compute and pass `effectiveAction`.

This ensures items using default actions get the correct row color (blue for scan, peach for send, pink for pickup, etc.) without breaking items that have an explicit `chosen_action`.

