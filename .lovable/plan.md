

## Fix: Velkomst e-mail DNS-fejl — brug kø uden run_id

### Problem
`send-welcome-email` kalder `fetch("https://email-api.lovable.dev/api/send-email")` direkte, men den URL er ikke tilgængelig fra edge functions (DNS-fejl). E-mails SKAL sendes via køen (`enqueue_email` RPC) og `process-email-queue`, som bruger `@lovable.dev/email-js` med den korrekte API-endpoint.

Tidligere køforsøg fejlede fordi payloaden indeholdt en tilfældig `run_id`, som API'et afviste (`run_not_found`).

### Løsning
Ændr `send-welcome-email` til at bruge køen igen, men **uden `run_id`**:

**`supabase/functions/send-welcome-email/index.ts`**:
- Fjern `sendLovableEmail`-helperfunktionen (direkte fetch)
- Brug `enqueue_email` RPC til at lægge beskeden i `transactional_emails`-køen
- Udelad `run_id` fra payload — `process-email-queue` sender `undefined` til `@lovable.dev/email-js`, som bør acceptere det
- Log status som "pending" i `email_send_log`
- Returnér `status: "queued"` (frontend viser allerede korrekt toast)

**Migration**: Ryd eventuelle fejlede/stuck beskeder fra køen.

| Fil | Ændring |
|---|---|
| `send-welcome-email/index.ts` | Erstat direkte fetch med `enqueue_email` RPC uden `run_id` |
| Migration | Ryd stuck kø-beskeder |

