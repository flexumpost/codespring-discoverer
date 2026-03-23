

## Fix: Recovery-e-mail fejler med "missing_unsubscribe"

### Problem
I `request-password-reset/index.ts` linje 103 sættes `purpose: "transactional"` på recovery-e-mailen. Email API'et kræver at transaktionelle e-mails har et `unsubscribe_token`. Recovery-mails er auth-e-mails og skal bruge `purpose: "auth"`.

Fejlen i process-email-queue logs:
```
Email API error: 400 {"type":"missing_unsubscribe","message":"Transactional emails must include an unsubscribe_token"}
```

E-mailen blev forsøgt 5 gange og er nu i dead-letter queue.

### Ændring

**`supabase/functions/request-password-reset/index.ts` — linje 103**

Ændr:
```
purpose: 'transactional',
```
Til:
```
purpose: 'auth',
```

Deploy `request-password-reset` efter ændringen.

### Bemærkning
Efter fix skal brugeren teste "Glemt adgangskode" igen, da den forrige e-mail er tabt (DLQ efter 5 fejlede forsøg).

