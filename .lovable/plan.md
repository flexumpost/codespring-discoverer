# Undgå duplikerede velkomstmail

## Problem
`cw@petites-pommes.com` modtog to `welcome_shipment`-emails den 6. august for samme forsendelse:
- 11:59 da pakken blev registreret (ny lejer).
- 12:06 da pakken blev afsendt med PostNord — her skulle systemet have sendt `shipment_dispatched`, men sendte i stedet endnu en velkomstmail.

## Årsag
Edge-funktionen `send-new-mail-email` overskriver eksplicit angivne skabeloner (fx `shipment_dispatched`) med `welcome_shipment`, når lejeren endnu ikke har logget ind første gang (`needsOnboarding`). Desuden markeres `tenants.welcome_email_sent_at` aldrig, så der er ingen beskyttelse mod gentagne velkomstmail.

## Løsning

### 1. Respekter eksplicit skabelonvalg
I `supabase/functions/send-new-mail-email/index.ts`: når kaldet angiver `template_slug`, skal denne skabelon bruges uanset `needsOnboarding`. Velkomstmail-faldtilbage må kun ske, når ingen `template_slug` er angivet.

### 2. Markér velkomstmail som sendt
Når en `welcome_shipment`-email sendes succesfuldt, opdater `tenants.welcome_email_sent_at = now()` for den pågældende lejer. Det forhindrer, at fremtidige hændelser (uden eksplicit skabelon) udløser endnu en velkomstmail.

### 3. Deploy og verificér
- Deploy `send-new-mail-email`.
- Verificér i `email_send_log` at fremtidige afsendelser af `shipment_dispatched` ikke længere bliver til `welcome_shipment` for lejere uden adgangskode.
- Verificér at `welcome_email_sent_at` sættes efter første velkomstmail.

## Teknisk detalje
Ændringen sker primært i `supabase/functions/send-new-mail-email/index.ts` omkring valget af `slug` og efter det succesfulde Resend-kald. Ingen databaseændringer er nødvendige, da `welcome_email_sent_at` allerede findes på `tenants`.
