

## Fix: Recovery-e-mail fejler med "invalid_parameter" (manglende run_id)

### Problem
`request-password-reset` enqueuer recovery-e-mailen med `purpose: 'auth'` i Lovable's email-kø. Email API'et kræver et `run_id` for auth-e-mails — dette `run_id` genereres kun af Lovable's auth-webhook-system (auth-email-hook). Da `request-password-reset` er en custom funktion der bypasser auth-hooket, har den intet `run_id`, og API'et afviser med 400 "invalid_parameter".

### Løsning
Send recovery-e-mailen direkte via Resend API (som `send-new-mail-email` allerede gør for andre e-mails), i stedet for at enqueue den i Lovable's email-kø. RESEND_API_KEY er allerede konfigureret.

### Ændring

**`supabase/functions/request-password-reset/index.ts`**

Erstat enqueue-blokken (linje 95-124) med et direkte Resend API-kald:

1. Hent `RESEND_API_KEY` fra environment
2. Send via `fetch("https://api.resend.com/emails", ...)` med `from: "Flexum <kontakt@flexum.dk>"`
3. Log `sent` eller `failed` i `email_send_log` baseret på Resend-responsen
4. Fjern `enqueue_email` RPC-kaldet

Dette matcher det eksisterende mønster i `send-new-mail-email` og undgår hele run_id-problemet.

### Deploy
Redeploy `request-password-reset` efter ændringen.

