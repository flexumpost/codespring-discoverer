# Tasks
- [x] Automate mailbox creation with stable Zoho IDs, 15-minute status checks and daily reconciliation. Ten recent mailboxes created with one welcome each; Hypervisor verified in authenticated UI. Historical accounts before 2026-11-10 require manual identity review.
- [x] Use authenticated polling instead of Zoho workflow configuration: connector API v6 cannot manage workflow rules (requires v8). Immediate outbound delivery remains unconfigured; status checks are live.
- [x] Link returned envelopes to shipment numbers, require tenant approval, and block letter dispatch. Tests and real 4107 review verified; no email sent or live approval/dispatch performed.
- [x] Add returned-letter photo/OCR registration, approved attachment email, and tenant resend response.
- [x] Correct Copenhagen Companions invoice 17955 to paid and record the correction.
- [x] Refresh stored company invoices during nightly reconciliation and verify the payment flow (both Copenhagen Companions invoices read back as paid from OfficeRnD).