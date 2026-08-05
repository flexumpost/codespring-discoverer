# Hvorfor virker invitationerne til Maj Pedersen ikke?

## Hvad data viser

Maj (`wondermaj@hotmail.com`) blev oprettet 4. august kl. 06:48 som inviteret bruger. Hun har aldrig bekræftet sin e-mail og har aldrig logget ind. Der er kun tre mails i loggen til hende:

- 28. juli: velkomstmail (sendt)
- 4. august 06:56: velkomstmail (sendt)
- 4. august 12:32: nulstil-adgangskode (sendt)

Der er ingen invitationsmail i loggen — faktisk er der ikke sendt en eneste "invite"-mail siden 28. juli.

## Hvad "Gensend invitation" gør i dag

Knappen tjekker, om lejeren allerede har en brugerkonto:

- **Har lejeren en konto** (som Maj har): der sendes en "Nulstil din adgangskode"-mail med et rå engangslink direkte til login-serveren.
- **Har lejeren ingen konto endnu**: der sendes en system-invitation.

## Tre årsager

1. **Engangslinket bliver "brugt op" af Hotmail.** Maj får nulstil-mailen, og den indeholder et engangslink. Outlook/Hotmails sikkerhedsscanner åbner automatisk links i indgående mails — dermed er linket forbrugt, inden Maj selv klikker, og hun ser "linket er udløbet". Det er præcis samme problem, vi tidligere så hos en anden Hotmail-bruger. Den to-trins-bekræftelse, vi lagde ind på siden, hjælper ikke her, fordi forbruget sker hos login-serveren, før appen overhovedet åbnes.

2. **Velkomstmailen indeholder ingen "Sæt din adgangskode"-knap.** Knappen vises kun, hvis der følger et adgangskode-link med, men lejer-oversigten sender aldrig et link med. Maj fik derfor kun en tekst med et login-link — og hun har ingen adgangskode at logge ind med. Login-linket peger desuden på det gamle midlertidige domæne i stedet for post.flexum.dk.

3. **Den anden gren af knappen (system-invitation) sender ikke noget.** Invitationen fra 4. august 06:48 gav hverken mail eller fejl i loggen, og der er ikke sendt en eneste invitationsmail siden 28. juli. Knappen ser altså ud til at lykkes, uden at der sker noget.

Vi har allerede en robust løsning i systemet: de 24-timers onboarding-links, som bruges i "ny post"-mails. De kan ikke ødelægges af mailscannere, fordi linket først indløses, når brugeren aktivt klikker "Fortsæt" inde i appen. Den mekanisme skal bruges alle steder.


## Løsning

1. Velkomstmailen får altid et 24-timers onboarding-link ("Sæt din adgangskode"), når lejeren endnu ikke har sat adgangskode — genereret i backend, så operatøren ikke skal gøre noget ekstra.
2. Login-linket i velkomstmailen rettes til post.flexum.dk.
3. Nulstil-adgangskode-mailen skifter fra rå engangslink til samme 24-timers onboarding-link, så Hotmail/Outlook ikke kan bruge det op.
4. Invitationsflowet i lejer-oprettelsen holder op med at læne sig på den tavse auth-invitation: der oprettes bruger uden mail, og velkomst-/adgangskodemailen sendes ad den kanal, vi ved virker og logger.
5. Når det er på plads: send en ny mail til Maj og bekræft i e-mail-loggen at den er "sent" og at linket kan bruges.

## Teknisk

- `supabase/functions/send-welcome-email/index.ts`: hvis lejerens bruger mangler `email_confirmed_at`/adgangskode, opret række i `onboarding_tokens` (24 t) og send `recoveryLink = https://post.flexum.dk/set-password?onboarding_token=<token>` til `WelcomeEmail`; ret `loginUrl` til `https://post.flexum.dk/login`. Fortsæt med at logge i `email_send_log`.
- `supabase/functions/request-password-reset/index.ts`: erstat `auth.admin.generateLink` med oprettelse af `onboarding_tokens`-række og link til `/set-password?onboarding_token=...`; bevar rate limit (5/t) og logning.
- `supabase/functions/create-tenant-user/index.ts`: brug `invite_silent` som standard i stedet for `inviteUserByEmail`, så mailen altid går gennem den loggede kanal.
- `SetPasswordPage` og `consume-onboarding-token` kræver ingen ændringer — de understøtter allerede `onboarding_token` med to-trins-bekræftelse.
- Deploy de ændrede funktioner og genudsend til `wondermaj@hotmail.com`; verificér række med status `sent` i `email_send_log`.
