

## Fix: Deploy opdateret process-email-queue + ryd ALLE stuck beskeder

### Årsag
1. Den opdaterede `process-email-queue` med dynamisk payload-opbygning er **ikke deployet**. Den kørende version sender stadig `run_id: undefined` til API'et.
2. Migrationen slettede kun besked 13 og 14, men besked 15-20 sidder stadig i køen med den gamle payload der indeholder `run_id`.

### Løsning

**1. Migration: Ryd ALLE stuck beskeder fra køen**
```sql
SELECT pgmq.delete('transactional_emails', 15);
SELECT pgmq.delete('transactional_emails', 16);
SELECT pgmq.delete('transactional_emails', 17);
SELECT pgmq.delete('transactional_emails', 18);
SELECT pgmq.delete('transactional_emails', 19);
SELECT pgmq.delete('transactional_emails', 20);
UPDATE email_send_state SET retry_after_until = NULL, updated_at = now() WHERE id = 1;
```

**2. Redeploy `process-email-queue`** — den vigtigste del. Uden dette kører den gamle kode stadig.

**3. Redeploy `send-welcome-email`** — sikre at den seneste version også er aktiv.

Herefter kan du sende en ny velkomst-e-mail, som vil blive kølagt med korrekt payload (uden `run_id`) og processeret af den nye kode.

| Trin | Handling |
|---|---|
| Migration | Slet besked 15-20 + nulstil rate-limit |
| Deploy | `process-email-queue` og `send-welcome-email` |

