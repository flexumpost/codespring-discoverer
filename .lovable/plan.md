## Mål

Når en operatør afviser en scanning, skal lejer modtage:

1. **In-app notifikation** (klokken) — kort besked
2. **Email-notifikation** til lejerens kontakt-email (og eventuelle ekstra tenant_users), med:
   - Besked om at scanningen er annulleret
   - Operatørens begrundelse
   - Information om at brevet sendes automatisk på næste forsendelsesdato, hvis lejer ikke foretager sig yderligere
   - Login-link

## Løsning

### 1. Ny edge function: `notify-scan-rejected`

Følger samme mønster som `notify-scan-request`:
- Auth: operator JWT (verificeret via `auth.getClaims`)
- Input: `{ mail_item_id }`
- Henter `mail_items` + `tenants` (contact_email, navn, user_id)
- Henter ekstra modtagere via `tenant_users` → `profiles`
- Indsætter in-app notifikation i `notifications` (service_role omgår RLS):
  ```
  title: 'Scanning annulleret'
  message: 'Din anmodning om scanning' + ev. ' (nr. <stamp>)' +
           ' er blevet annulleret. Årsag: <reason>.\n
           Hvis du ikke foretager dig yderligere, sendes brevet på næste forsendelsesdato.'
  ```
- Sender email via Resend (`kontakt@flexum.dk`) til lejerens contact_email + ekstra modtagere
- HTML-body (inline, dansk):
  - Hilsen med lejernavn
  - "Vi har desværre måttet annullere scanning af forsendelse #<stamp>."
  - Operatørens begrundelse i en citatboks
  - "Hvis du ikke foretager dig yderligere, sender vi brevet til dig på næste forsendelsesdato."
  - Login-knap → `https://post.flexum.dk/login`
- Logger til `email_send_log` med `template_name: 'scan_rejected'`

Konfig: `supabase/config.toml` får `[functions.notify-scan-rejected]` med `verify_jwt = false` (samme som andre funktioner).

### 2. Frontend: kald edge function efter rejection

I `src/components/OperatorMailItemDialog.tsx` → `handleRejectAction`:
- Efter den nuværende `supabase.from("mail_items").update(...)` lykkes
- Kald `supabase.functions.invoke("notify-scan-rejected", { body: { mail_item_id: item.id } })`
- Logfejl, men block ikke UI'et hvis email fejler (toast.success vises stadig)

### 3. Ingen DB-trigger nødvendig

Edge function håndterer både in-app notifikation og email i én operation — undgår dobbeltlogik og holder alt samlet.

## Filer

- **Ny:** `supabase/functions/notify-scan-rejected/index.ts`
- **Opdateret:** `supabase/config.toml` (tilføj function-block)
- **Opdateret:** `src/components/OperatorMailItemDialog.tsx` (kald edge function i `handleRejectAction`)

Ingen DB-migration nødvendig.
