

## Fix: Manglende `text`-parameter i velkomst e-mail

### Problem
Loggen viser fejlen: `missing_parameter` → `text`. Lovable Email API kræver et `text`-felt (plain-text version af e-mailen). Payloaden i `send-welcome-email` sender kun `html`, ikke `text`.

### Løsning

**`supabase/functions/send-welcome-email/index.ts`** (linje 116-128):
Tilføj `text`-felt til payload med en plain-text version af body:

```typescript
payload: {
  run_id: crypto.randomUUID(),
  message_id: messageId,
  to: tenant.contact_email,
  from: "Flexum <noreply@notify.flexum.dk>",
  sender_domain: "notify.flexum.dk",
  subject,
  html,
  text: bodyRaw.replace(/<[^>]*>/g, ""),  // Strip HTML tags for plain-text fallback
  purpose: "transactional",
  label: "welcome",
  queued_at: new Date().toISOString(),
},
```

Ryd også de fejlede beskeder fra køen via migration og genudrul edge function.

| Fil | Ændring |
|---|---|
| `send-welcome-email/index.ts` | Tilføj `text`-felt til payload |
| Migration | Ryd fejlede beskeder fra kø |

