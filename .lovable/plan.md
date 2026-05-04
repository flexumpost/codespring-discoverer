## Problem

Knappen **"Gensend invitation"** (i `TenantDetailPage.tsx`) kalder i dag `send-new-mail-email` med `is_new_tenant: true`, hvilket sender `welcome_shipment`-skabelonen — en mail der lister forsendelser og er tænkt til "ny lejer + ny forsendelse på samme tid". Det er forkert konteksten "gensend invitation alene".

`welcome_shipment` skal forblive som den er, men kun bruges automatisk når en ny bruger oprettes samtidigt med at der registreres post til vedkommende (det eksisterende flow andre steder).

## Løsning

Skift "Gensend invitation"-knappen til at trigge et rent invitations-flow via `create-tenant-user` edge-funktionen i `mode: "invite"`. Denne sti:

- Kalder `auth.admin.inviteUserByEmail()` som Supabase Auth routes via `auth-email-hook`
- Bruger den brandede `invite.tsx`-skabelon (auth-email)
- Indeholder magic link til `/set-password` så modtageren kan sætte adgangskode og logge ind
- Opdaterer ikke nogen mail_items — det er en ren konto-invitation

## Ændringer

### 1. `src/pages/TenantDetailPage.tsx` — `ResendInviteButton`

Opdater `handleResend` til at kalde `create-tenant-user` i stedet for `send-new-mail-email`:

- Hent tenant'ens `contact_email`, `contact_first_name`, `contact_last_name` (ligger allerede i den indlæste tenant — kan tilgås via prop eller hentes via id)
- Send body: `{ tenant_ids: [tenantId], email, first_name, last_name, mode: "invite" }`
- Hvis brugeren allerede findes (`existingUser`), vil `inviteUserByEmail` ikke køre — i stedet falder funktionen igennem og sender ingen mail. For at "gensend" til en eksisterende bruger genererer vi i stedet et password-recovery link.

For at understøtte begge cases tilpasser vi enten edge-funktionen eller bruger en simpel client-side fallback. Den reneste løsning:

- **Udvid `create-tenant-user`** så den i `mode: "invite"` for **eksisterende brugere** genererer en password-recovery-link via `auth.admin.generateLink({ type: "recovery", redirectTo: ".../set-password" })` og sender den via `auth-email-hook`-flow'et. Det giver samme brandede invite/recovery e-mail uanset om brugeren er ny eller eksisterende.

  Konkret: tilføj en gren i `create-tenant-user` der, hvis `mode === "invite"` og brugeren findes, kalder `generateLink({ type: "recovery", email, options: { redirectTo: ${origin}/set-password } })`. Resultatets `action_link` udsendes via Supabase' standard recovery-email (auth-email-hook → `recovery.tsx`).

  Alternativ: brug `inviteUserByEmail` kun til nye brugere og kald en separat password-reset for eksisterende — men vi har allerede `request-password-reset` edge-funktionen, så vi kan bare invokere den fra klienten som fallback. Dette er enklere og kræver ikke ændringer i `create-tenant-user`.

### Valgt tilgang (enklere)

I `ResendInviteButton.handleResend`:

1. Slå tenant op (eller brug allerede tilgængelig `tenant`-data fra parent) → `email`, `first_name`, `last_name`
2. Tjek om brugeren allerede findes ved at se på `tenant.user_id`:
   - **`tenant.user_id === null`** → kald `create-tenant-user` med `mode: "invite"` (sender `invite.tsx`-skabelon via auth-email-hook)
   - **`tenant.user_id` er sat** → kald `request-password-reset` (sender `recovery.tsx`-skabelon via auth-email-hook)
3. Vis toast "Invitation sendt"

### 2. Pas `ResendInviteButton`-signaturen

Ændr fra `{ tenantId }` til at modtage hele `tenant`-objektet (eller minimum: `id`, `user_id`, `contact_email`, `contact_first_name`, `contact_last_name`) — disse felter er allerede hentet i `TenantDetailPage.tsx`.

### 3. i18n

Eksisterende strenge (`resendInvitation`, `invitationResent`, `couldNotResendInvitation`) genbruges — ingen ændringer nødvendige.

## Hvad ændres IKKE

- `send-new-mail-email` edge-funktionen og `welcome_shipment`-skabelonen forbliver uændrede — de bruges fortsat i andre flows hvor en ny lejer oprettes samtidig med ny post (fx `RegisterMailDialog`/bulk-upload med `is_new_tenant: true`).
- `auth-email-hook`, `invite.tsx`, `recovery.tsx` er allerede sat op og deployer sender korrekte mails via det nye `notify.mail.post.flexum.dk`-domæne.
- Ingen DB-migrationer nødvendige.

## Filer der røres

- `src/pages/TenantDetailPage.tsx` — `ResendInviteButton` opdateres

Ingen edge-functions skal redeployes.

## Test efter implementation

1. Tenant uden `user_id` → klik "Gensend invitation" → modtager skal få branded `invite.tsx`-mail med "Accept Invitation"-knap
2. Tenant med `user_id` → klik "Gensend invitation" → modtager skal få branded `recovery.tsx`-mail med reset-link
3. Bekræft at ingen forsendelser/scans nævnes i mailen
