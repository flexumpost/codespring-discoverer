

## Problem

The ShippingAddressGuard dialog has no `overflow-y-auto` or `max-h` constraint. The DialogContent uses `fixed top-[50%] translate-y-[-50%]` positioning without scroll. With 7 form fields + header + button, the dialog overflows the viewport on smaller screens, making the "Gem forsendelsesadresse" button unreachable.

Additionally, if the RLS update silently fails (PostgREST returns 200 with 0 rows affected), the mutation reports success but nothing is saved — the guard re-appears with no error feedback.

## Plan

**File: `src/components/ShippingAddressGuard.tsx`**

1. **Add scrolling to dialog**: Add `max-h-[90vh] overflow-y-auto` to the DialogContent so the form is scrollable on small screens and the save button is always reachable.

2. **Detect silent RLS failure**: After the `.update()` call, re-fetch the tenant row to verify `shipping_confirmed` was actually set to `true`. If not, throw an error so the user sees a meaningful error toast instead of a false success.

### Files changed
- `src/components/ShippingAddressGuard.tsx`

