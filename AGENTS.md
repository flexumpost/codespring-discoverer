# Architecture Rules

- Returned envelopes link original mail IDs and shipment snapshots in returned_letters; database triggers validate ownership, block letter dispatch until every return is approved, and requeue approved letters without erasing shipment logs. Tenant responses never dispatch mail automatically.

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.
- After any shipping address save (tenant or operator), the client calls one authenticated edge function (via a shared helper) that syncs Zoho CRM, emails the tenant and emails the operator with the sync result; the DB trigger only creates in-app operator notices for tenant-made changes, because trigger-to-function calls depend on an unreliable vault key.
- Tenant onboarding tour state lives in profiles.tour_completed_at and a client-only TourProvider; demo shipments and the shared action-dialog preview are client-only with inert action callbacks, so the tour never writes mail data or books actions.
- Invoice reconciliation refreshes stored company invoices directly by invoice ID independently of member lookup, because company-only invoices are absent from member-filtered lists; failed reads never clear stored debt.
