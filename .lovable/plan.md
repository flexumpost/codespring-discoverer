

## Plan: Send email to kontakt@flexum.dk on "Scan nu" request

### Problem
When a tenant requests "Scan nu", an in-app notification is created for operators via the DB trigger, but no email notification is sent to kontakt@flexum.dk.

### Approach
Create a new lightweight edge function `notify-scan-request` that any authenticated user can call. It sends a simple email to kontakt@flexum.dk with details about the scan request (tenant name, stamp number). Trigger it from `TenantDashboard.tsx` after the `chooseAction` mutation succeeds with action `"scan"`.

### Changes

**1. New edge function** (`supabase/functions/notify-scan-request/index.ts`)
- Accepts `{ mail_item_id }` in the body
- Verifies the caller is authenticated (no operator check — tenants call this)
- Fetches the mail item + tenant details using service role
- Sends email to `kontakt@flexum.dk` via Resend with subject like "Scan-anmodning: [Company] (nr. X)"
- Logs to `email_send_log`
- Simple HTML email (no React Email template needed — plain informational email)

**2. Config update** (`supabase/config.toml`)
- Add `[functions.notify-scan-request]` with `verify_jwt = false` (auth checked in code)

**3. Trigger from TenantDashboard** (`src/pages/TenantDashboard.tsx`)
- In `chooseAction.onSuccess`: if the action was `"scan"`, call `supabase.functions.invoke("notify-scan-request", { body: { mail_item_id: id } })`
- Fire-and-forget (don't block UI on email result)

### Files changed
- `supabase/functions/notify-scan-request/index.ts` — new
- `src/pages/TenantDashboard.tsx` — add email trigger in onSuccess
- `supabase/config.toml` — add function config (auto-managed, noted for reference)

