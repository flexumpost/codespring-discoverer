

## Analyse: Invite-link virker ikke

### Problem
Brugeren `intellyinvest@gmail.com` (og potentielt alle 17+ nye brugere oprettet i dag) kan ikke bruge deres invite-link fordi det er udløbet.

**Årsag:** Når en ny lejer oprettes via RegisterMailDialog, bruges `invite_silent` mode som:
1. Opretter brugeren med en tilfældig adgangskode og `email_confirm: true`
2. Kalder `send-new-mail-email` med `is_new_tenant: true`
3. `send-new-mail-email` genererer et **recovery link** via `generateLink({ type: "recovery" })`

Recovery links har en standard udløbstid på **1 time** (Supabase default). Brugeren `intellyinvest@gmail.com` blev oprettet kl. 11:13, men forsøgte at bruge linket kl. 18:04 — 7 timer senere. Auth-loggen bekræfter: `"email link has expired"`.

**Omfang:** Alle 17 brugere oprettet i dag har `last_sign_in_at = NULL`, hvilket betyder de aldrig har logget ind. Deres recovery links er sandsynligvis også udløbet.

### Løsning

**1. `supabase/functions/send-new-mail-email/index.ts`**
- Erstat `generateLink({ type: "recovery" })` med `generateLink({ type: "magiclink" })` som har længere levetid, ELLER
- Brug i stedet `request-password-reset` Edge Function til at generere linket, da den allerede håndterer dette korrekt.

Bedre tilgang: Brug `generateLink({ type: "invite" })` i stedet, da invite-tokens har 24 timers levetid (i modsætning til recovery-tokens som har 1 time).

**2. `src/pages/TenantsPage.tsx` / `src/pages/TenantDetailPage.tsx`**
- Tilføj en "Gensend invitation" knap for brugere der aldrig har logget ind (`last_sign_in_at = NULL`). Denne knap skal generere et nyt invite/recovery link og sende e-mailen igen.

### Ændringer

**Fil 1: `supabase/functions/send-new-mail-email/index.ts` (linje 145)**
- Ændr `type: "recovery"` til `type: "invite"` i `generateLink`-kaldet for nye lejere. Invite-tokens har 24 timers levetid vs. recovery-tokens som kun har 1 time.

**Fil 2: Tilføj "Gensend invitation" funktionalitet**
- På TenantDetailPage: Vis en "Gensend invitation" knap for lejere som har en `contact_email` men `last_sign_in_at = NULL` (eller aldrig har sat adgangskode).
- Denne kalder `send-new-mail-email` med `is_new_tenant: true` for at generere et nyt link.

### Akut handling for eksisterende brugere
De 17 brugere med udløbne links kan bruge "Glemt adgangskode" på login-siden, da det allerede er implementeret via `request-password-reset`. Alternativt kan operatøren gensende invitationen via den nye knap.

### Tekniske detaljer
- `generateLink({ type: "invite" })` har 24 timers token-levetid (Supabase default for invite tokens)
- `generateLink({ type: "recovery" })` har kun 1 times token-levetid
- Alle 17 brugere oprettet i dag er berørt: de har alle `email_confirmed_at` sat men `last_sign_in_at = NULL`

