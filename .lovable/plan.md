## Årsag

Velkomst e-mailen kan kun sendes via topknappen "Send velkomst e-mail" i `src/pages/TenantsPage.tsx` (linje 232), efter at man markerer lejere i listen med checkbokse. Den knap virker også som gensend — der er ingen spærring på `welcome_email_sent_at`, og edge function'en `send-welcome-email` sender til alle tenants den får i `tenant_ids` (inkl. når flere deler samme e-mail).

Du har sandsynligvis ikke set/brugt den, fordi:
- Knappen er kun aktiv når mindst én lejer er afkrydset.
- Den hedder "Send" — ikke "Gensend" — selv om kolonnen viser at velkomstmailen allerede er sendt.
- Inde på lejer-detaljesiden er der kun "Gensend invitation" (sender enten invite eller password-reset via auth-email-hook — ikke velkomst-skabelonen).

Så for Nordtræ Entreprise og Nordengen kan du allerede i dag: åbn "Lejere", afkryds de to rækker, klik "Send velkomst e-mail" — de bliver gensendt via Resend (begge til `fmb@nordt.dk`). Men der mangler en tydelig pr.-lejer "Gensend"-knap.

## Ændring

`src/pages/TenantsPage.tsx`, kolonnen "Velkomst e-mail" (linje 320-327):

- Bevar visning af dato når `welcome_email_sent_at` er sat.
- Tilføj ved siden af datoen en lille `Button variant="ghost" size="sm"` med ikonet `MailPlus` og tekst `tenants.resendWelcomeEmail` ("Gensend").
- onClick (med `e.stopPropagation()` så raden ikke navigerer):
  - Kald `sendWelcomeMutation.mutate([tenant.id])` — genbruger eksisterende mutation, toast, invalidation.
- Når `welcome_email_sent_at` er null, vis i stedet samme knap med tekst `tenants.sendWelcomeEmail` ("Send") så enkelt-afsendelse også er muligt uden checkbox.
- Disable knappen mens `sendWelcomeMutation.isPending` er sand for den valgte række (track `pendingTenantId` i lokal state for at undgå at disable alle).

`src/i18n/locales/da.json` og `en.json` (sektionen `tenants`):

- Tilføj `resendWelcomeEmail`: "Gensend" / "Resend".
- Genbrug eksisterende `sendWelcomeEmail` til "Send"-varianten.

## Ud af scope

- Detaljesidens "Gensend invitation"-knap (uændret, sender invite/recovery).
- Edge function `send-welcome-email` (uændret — virker allerede med delt e-mail).
- Top-bulk-knappen "Send velkomst e-mail" (uændret).
- Logik for at vise modtager-status (suppression, fejl).

## Verifikation

1. Åbn "Lejere", find Nordtræ Entreprise — kolonnen viser dato + "Gensend"-knap. Klik → toast "Velkomst e-mail sendt til 1 lejer(e)", `welcome_email_sent_at` opdateres, `email_send_log` får ny `sent`-række for `fmb@nordt.dk`.
2. Gentag for Nordengen ApS — ny sending sker uafhængigt selv om e-mailen er den samme.
3. For en lejer uden `welcome_email_sent_at` viser kolonnen "Send"-knap som gør det samme.
4. Top-bulk-knappen fungerer stadig som før når man afkrydser flere rækker.
