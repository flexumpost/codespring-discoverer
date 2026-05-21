## Hvad jeg fandt

To uafhængige fejl ramte forsendelserne for Rawa A/S den 21-05-2026 kl. 10:26 (brev #3256 og #3257):

### 1. OfficeRnD-gebyret kunne ikke overføres

`officernd_sync_log` viser for begge breve:

```
status: failed
error_message: No OfficeRnD member found for kontakt@rawa.dk
```

Lejeren i Lovable hedder `kontakt@rawa.dk` (det er `tenants.contact_email`), men i OfficeRnD findes medlemmet under en anden email — sandsynligvis `kontakt@rawabyg.dk` (den email der står som ekstra bruger på lejeren og som du selv refererer til).

`sync-officernd-charge-batch` slår kun op på `tenants.contact_email` — den prøver ikke andre emails på lejeren. Når der ikke findes et match, logges fejlen og der oprettes intet charge.

### 2. shipping_dispatched email til kontakt@rawabyg.dk fejlede

`email_send_log` viser:

- `kontakt@rawa.dk` (primær) → `sent` ✅
- `kontakt@rawabyg.dk` (ekstra tenant_user) → `failed` med Resend 429:
  `"Too many requests. You can only make 5 requests per second."`

Den primære og de ekstra modtagere sendes i en stram løkke uden delay. Når shipping-siden afsender flere breve på én gang (2 breve × 2 modtagere = 4 mails inden for ~200 ms, oveni evt. OfficeRnD-kald og andre baggrundsmails), rammer vi Resends 5 req/sek grænse. Samme fejl er sket tidligere (30-04-2026, brev #3109).

## Anbefalet rettelse

### A. OfficeRnD member lookup — fallback til alle tenant-emails

I `supabase/functions/sync-officernd-charge-batch/index.ts` (linje 262-294) og samme blok i `sync-officernd-charge/index.ts`:

1. Saml alle kandidat-emails for lejeren: `tenants.contact_email` + alle `profiles.email` for tilknyttede `tenant_users`.
2. Slå op i OfficeRnD i prioriteret rækkefølge — første match vinder.
3. Skriv den fundne email ind i `officernd_sync_log.error_message`/metadata for sporbarhed.
4. Først hvis ingen af emails giver match → log `failed` med listen af forsøgte emails.

Dette løser Rawa-sagen uden manuelt at skulle rette emailen i Lovable eller OfficeRnD, og det dækker fremover alle lejere hvor OfficeRnD-medlemmet er registreret på en sekundær email.

### B. Resend rate limit — throttle udsendelsen

I `supabase/functions/send-new-mail-email/index.ts`:

1. Tilføj et lille delay (~250 ms) mellem hver fetch til Resend i `for (const extraEmail of extraEmails)`-løkken (linje 268). Det holder os under 5 req/sek selv hvis main + extras sendes sekventielt.
2. Retry én gang på 429 efter `Retry-After`-headeren (eller 1 sek hvis ikke til stede), så enkelte sammenstød ikke ender som hård fejl.
3. På shipping-siden (`src/pages/ShippingPrepPage.tsx` linje 309-319) afsendes `send-new-mail-email` i en `for`-løkke uden `await` — overvej at sekventialisere med et lille delay mellem hver `invoke` så vi ikke fyrer N parallelle funktion-kald af på én gang.

### C. Genafsendelse for Rawa (manuel oprydning efter fix)

Når A og B er deployet:

- Genkør OfficeRnD-sync for de to breve (#3256, #3257) — fx via et lille admin-endpoint eller direkte ved at kalde `sync-officernd-charge-batch` med `mail_item_ids: ["053b863a…","7546f903…"]`. Med fix A vil den nu finde Rawa-medlemmet via `kontakt@rawabyg.dk`.
- Genprøv den fejlede email via knappen "Genprøv fejlede emails" i operator-portalen (den eksisterende `retry-failed-emails`-funktion).

## Filer der berøres

- `supabase/functions/sync-officernd-charge-batch/index.ts` (member lookup + fallback)
- `supabase/functions/sync-officernd-charge/index.ts` (samme fallback for single-sync)
- `supabase/functions/send-new-mail-email/index.ts` (delay + retry på 429)
- `src/pages/ShippingPrepPage.tsx` (sekventialisering af email-invokes — valgfrit, hjælpsomt)

Ingen DB-ændringer kræves.
