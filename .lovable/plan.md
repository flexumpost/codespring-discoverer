

## Ny tilgang: Fix e-mail afsendelse fra bunden

### Analyse af de faktiske fejl

Loggen viser to problemer:
1. **msg 11** (gammel besked): `missing_parameter: run_id` — API'et kræver `run_id`, men den er ikke i payloaden
2. **msg 12** (ny besked, også uden `run_id`): `429 rate_limited` — rate limit pga. mange fejlede forsøg

Kerneproblemet: `process-email-queue` sender **altid** `run_id: payload.run_id` til API'et (linje 247). Når `run_id` er `undefined`, inkluderes det stadig i JSON som `null`/`undefined`, og API'et afviser det med `missing_parameter`.

### Løsning

**1. Fix `process-email-queue/index.ts`** — Byg payload-objektet dynamisk så `run_id` KUN inkluderes når den faktisk har en værdi:

```typescript
// Før (linje 245-258):
await sendLovableEmail({
  run_id: payload.run_id,  // <-- sender undefined/null
  to: payload.to,
  ...
})

// Efter:
const emailPayload: Record<string, unknown> = {
  to: payload.to,
  from: payload.from,
  sender_domain: payload.sender_domain,
  subject: payload.subject,
  html: payload.html,
  text: payload.text,
  purpose: payload.purpose,
  label: payload.label,
  message_id: payload.message_id,
};
// Only include run_id if present (auth emails have it, transactional don't)
if (payload.run_id) emailPayload.run_id = payload.run_id;
if (payload.idempotency_key) emailPayload.idempotency_key = payload.idempotency_key;
if (payload.unsubscribe_token) emailPayload.unsubscribe_token = payload.unsubscribe_token;

await sendLovableEmail(emailPayload, { apiKey, sendUrl: ... });
```

**2. Migration** — Ryd ALLE stuck beskeder fra køen og nulstil rate-limit cooldown:

```sql
-- Slet gamle fejlede beskeder fra køen
SELECT pgmq.delete('transactional_emails', 11);
SELECT pgmq.delete('transactional_emails', 12);
-- Nulstil rate-limit cooldown
UPDATE email_send_state SET retry_after_until = NULL WHERE id = 1;
```

**3. Redeploy** `process-email-queue` edge function.

| Fil | Ændring |
|---|---|
| `process-email-queue/index.ts` | Byg payload dynamisk — udelad `run_id` når den er tom |
| Migration | Ryd kø + nulstil rate-limit |

