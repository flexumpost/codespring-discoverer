

## Bug: Operator dashboard shows "0 kr." for Lite scan

### Root Cause

In `getItemFee()` (OperatorDashboard.tsx, line 297), when `chosen_action === defaultAction`, the code only has special pricing logic for `afhentning` and `send`. Everything else (including `scan`) falls through to `return "0 kr."` on line 319.

So when a Lite tenant has `default_mail_action = "scan"` and chooses scan, the operator dashboard incorrectly returns "0 kr." instead of "50 kr.".

### Fix

Add a scan pricing check in the `chosen_action === defaultAction` block (around line 297-319), before the catch