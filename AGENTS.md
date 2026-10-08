# Architecture Rules

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.
- After any shipping address save (tenant or operator), the client calls one authenticated edge function (via a shared helper) that syncs Zoho CRM, emails the tenant and emails the operator with the sync result; the DB trigger only creates in-app operator notices for tenant-made changes, because trigger-to-function calls depend on an unreliable vault key.
- Tenant onboarding tour state lives in profiles.tour_completed_at and a client-only TourProvider; demo shipments and the shared action-dialog preview are client-only with inert action callbacks, so the tour never writes mail data or books actions.
