## Skift til Resend som ekstern e-mail udbyder

Du har helt ret — den indbyggede e-mail-afsendelse har en vedvarende deploy-fejl med `run_id`, og det er spild af tid at blive ved med at prøve. Lad os skifte til **Resend**, som er en pålidelig ekstern e-mail-udbyder med en gratis tier (100 e-mails/dag) — perfekt til dit behov.

### Hvad der skal ske

**1. Opsæt Resend-konto og API-nøgle**

- Du opretter en konto på [resend.com](https://resend.com)
- Du tilføjer og verificerer dit domæne `flexum.dk` i Resend (DNS-records)
- Du genererer en API-nøgle
- Vi gemmer API-nøglen sikkert i projektet

**2. Ny Edge Function: `send-email-resend**`

- Enkel funktion der sender e-mails direkte via Resend API
- Ingen kø, ingen `run_id`, ingen `@lovable.dev/email-js`
- Afsender: `Flexum <kontakt@flexum.dk>`
- Modtager HTML + plain-text fra kaldende funktion

**3. Opdater `send-welcome-email**`

- I stedet for at lægge i kø via `enqueue_email`, kalder den direkte `send-email-resend` via fetch
- Rendrer stadig HTML via React Email-skabelonen (WelcomeEmail)
- Sætter `welcome_email_sent_at` når Resend bekræfter afsendelse (synkront svar)

**4. Ryd op**

- Fjern afhængighed af `process-email-queue` for transaktionelle e-mails
- Auth-e-mails (signup, recovery osv.) fortsætter via den nuværende auth-email-hook (de virker allerede, da de har `run_id`)

### Tekniske detaljer

```text
send-welcome-email
  ├── Render HTML via WelcomeEmail React-komponent
  ├── POST til Resend API (https://api.resend.com/emails)
  │   ├── from: "Flexum <kontakt@flexum.dk>"
  │   ├── to: lejer.contact_email
  │   ├── subject + html + text
  │   └── API-nøgle fra RESEND_API_KEY secret
  ├── Ved succes: opdater welcome_email_sent_at
  └── Ved fejl: returner fejl til UI
```


| Fil                                              | Ændring                                     |
| ------------------------------------------------ | ------------------------------------------- |
| `supabase/functions/send-welcome-email/index.ts` | Send direkte via Resend API i stedet for kø |
| Secret: `RESEND_API_KEY`                         | Skal tilføjes af dig                        |


### Fordele

- Ingen kø-kompleksitet for 0–50 mails/dag
- Direkte feedback: du ved med det samme om mailen er sendt
- Resend har god dashboard med logs, bounce-tracking osv.
- Gratis op til 100 mails/dag