

## Fix: Recovery-e-mails fejler med 404 "run_not_found"

### Problem
`request-password-reset` sætter `run_id: messageId` i køen, hvor `messageId` er et tilfældigt UUID. Når `process-email-queue` sender e-mailen, inkluderer den `run_id` i API-kaldet (linje 259). Email API'et forventer en gyldig, forud-oprettet `run_id` — det tilfældige UUID findes ikke, så API'et returnerer 404 `run_not_found`.

Recovery-e-mails har `purpose: "transactional"`, og transaktionelle e-mails skal bruge `idempotency_key` i stedet for `run_id`. Queue-processoren håndterer dette korrekt — den inkluderer kun `run_id` hvis det er sat.

### Ændring

**`supabase/functions/request-password-reset/index.ts` (linje 91-107)**

I `enqueue_email`-payloaden:
- Fjern `run_id: messageId`
- Tilføj `idempotency_key: \`recovery-\${messageId}\``

```typescript
const { error: enqueueError } = await supabase.rpc('enqueue_email', {
  queue_name: 'auth_emails',
  payload: {
    // run_id fjernet — transaktionelle e-mails bruger idempotency_key
    idempotency_key: `recovery-${messageId}`,
    message_id: messageId,
    to: cleanEmail,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    sender_domain: SENDER_DOMAIN,
    subject: 'Nulstil din adgangskode',
    html,
    text,
    purpose: 'transactional',
    label: 'recovery',
    queued_at: new Date().toISOString(),
  },
})
```

Derefter deploy `request-password-reset` Edge Function.

