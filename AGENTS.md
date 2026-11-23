# Architecture Rules
- Standalone C4 printing uses the shared EnvelopePrint renderer with an explicit optional P override and client-only editable address drafts, so it never alters tenants or dispatches mail.
- New-mail notices use database batches with a two-minute quiet period and per-recipient delivery records; SMS consent belongs to each user, and the managed worker schedule runs only while the queue is nonempty to avoid idle polling.
- Zoho onboarding uses unique account IDs, a shared field mapper, and authenticated polling through the existing webhook; reconcile only missing accounts and unfinished invitations, preserving existing mailbox settings and manual closures.

- Returned envelopes link original mail IDs and shipment snapshots in returned_letters; database triggers validate ownership, block letter dispatch until every return is approved, and requeue approved letters without erasing shipment logs. Tenant responses never dispatch mail automatically.

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.
- After any shipping address save (tenant or operator), the client calls one authenticated edge function (via a shared helper) that syncs Zoho CRM, emails the tenant and emails the operator with the sync result; the DB trigger only creates in-app operator notices for tenant-made changes, because trigger-to-function calls depend on an unreliable vault key.
- Tenant onboarding tour state lives in profiles.tour_completed_at and a client-only TourProvider; demo shipments and the shared action-dialog preview are client-only with inert action callbacks, so the tour never writes mail data or books actions.
- Invoice reconciliation refreshes stored company invoices directly by invoice ID independently of member lookup, because company-only invoices are absent from member-filtered lists; failed reads never clear stored debt.
