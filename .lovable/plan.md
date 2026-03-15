

## Fix: Velkomst e-mail fejler med "run_not_found"

### Problem
Loggen viser:
```
Email API error: 404 {"type":"run_not_found","message":"Run not found or expired"}
```

Årsagen: `send-welcome-email` genererer en tilfældig `run_id` via `crypto.randomUUID()` og enqueue'r beskeden. Men `run_id` er et Lovable-platform koncept der kun er gyldigt når det kommer fra en webhook (som auth-email-hook modtager). Den tilfældige UUID afvises af API'et.

### Løsning
Ændr `send-welcome-email` til at sende e-mails **direkte** via `sendLovableEmail` i stedet for at gå gennem køen. Velkomst-emails er enkeltstående sends (ikke bulk), så kø-retry er mindre kritisk. Fjern `run_id` fra kaldet — `sendLovableEmail` uden run_id sender direkte.

### Ændringer

**`supabase/functions/send-welcome-email/index.ts`**:
- Importer `sendLovableEmail` fra `@lovable.dev/email-js`
- Erstat `enqueue_email` RPC-kald med direkte `sendLovableEmail`-kald (uden `run_id`)
- Behold `email_send_log` insert for tracking
- Ryd de fejlede beskeder (msg 9 og 10) fra køen via migration

| Fil | Ændring |
|---|---|
| `send-welcome-email/index.ts` | Send direkte via `sendLovableEmail` i stedet for kø |
| Migration | Ryd fejlede kø-beskeder |

