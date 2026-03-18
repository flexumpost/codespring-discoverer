

## Problem

Når ny post registreres, oprettes en in-app notifikation (via `notify_tenant_on_mail` trigger), men der sendes **ingen e-mail** til lejeren. Skabelonen `new_shipment` findes i `email_templates`-tabellen, men ingen kode sender den.

## Løsning

Opret en ny edge function `send-new-mail-email` der sender en e-mail via Resend API (samme mønster som `send-welcome-email`), og kald den fra `RegisterMailDialog` efter succesfuld registrering.

### 1. Ny edge function: `supabase/functions/send-new-mail-email/index.ts`

- Modtager `{ tenant_id, mail_type, stamp_number }` i body
- Verificerer at kalderen er operator (samme auth-check som `send-welcome-email`)
- Slår lejeren op i `tenants` — skipper hvis ingen `contact_email`
- Henter `new_shipment`-skabelonen fra `email_templates`
- Erstatter `{{name}}` med kontaktperson/firmanavn og `{{stamp_number}}` med forsendelsesnr.
- Sender via Resend API med afsender `Flexum <kontakt@flexum.dk>`
- Logger i `email_send_log`

### 2. Opdater `RegisterMailDialog.tsx`

- Efter succesfuld insert af mail_item (linje ~508), kald edge function:
  ```
  supabase.functions.invoke("send-new-mail-email", {
    body: { tenant_id, mail_type, stamp_number }
  })
  ```
- Fire-and-forget (fejl logges men blokerer ikke registrering)

### 3. Config

- Tilføj `[functions.send-new-mail-email]` med `verify_jwt = false` i `config.toml`

### Skabelon-variabler

Udvid skabelonen til at understøtte: `{{name}}`, `{{company_name}}`, `{{stamp_number}}`, `{{mail_type}}`

