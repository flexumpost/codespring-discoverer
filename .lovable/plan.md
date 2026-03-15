

## Fix: Velkomst e-mail fejler med "invalid_purpose"

### Problem
Loggen viser at alle e-mails fejler med:
```
Email API error: 400 {"type":"invalid_purpose","message":"Only transactional emails are supported. Set purpose to \"transactional\"."}
```

`send-welcome-email` enqueue'r payloaden uden `purpose`, `from`, og `sender_domain` felter, som Lovable Email API kræver.

### Løsning

**`supabase/functions/send-welcome-email/index.ts`** (linje 115-120):
Tilføj de manglende felter til payload:

```typescript
payload: {
  to: tenant.contact_email,
  from: "Flexum <noreply@notify.flexum.dk>",
  sender_domain: "notify.flexum.dk",
  subject,
  html,
  purpose: "transactional",
  label: "welcome",
},
```

Derefter genudrul edge function'en.

| Fil | Ændring |
|---|---|
| `send-welcome-email/index.ts` | Tilføj `purpose`, `from`, `sender_domain` til enqueue payload |

