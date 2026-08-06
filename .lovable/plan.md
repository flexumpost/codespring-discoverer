# Velkomstmail sendes til gamle lejere — årsag og rettelse

## Hvad du så
Den 6. august blev der sendt `welcome_shipment`-mails til to lejere, som begge har været oprettet længe:

- Roepkjær ApS (`sderoepstorff@gmail.com`) — oprettet 20. marts
- PETITES POMMES APS (`cw@petites-pommes.com`) — oprettet 8. juni, fik **to** mails (11:59 og 12:06)

## Hvorfor
Det afhænger ikke af, hvor længe lejeren har eksisteret, men af om lejerens bruger nogensinde har logget ind. Begge brugere har aldrig logget ind.

Ved hver forsendelse tjekker afsendelsesfunktionen, om brugeren har logget ind. Er svaret nej, antages det, at lejeren mangler at sætte adgangskode, og funktionen **overskriver den valgte skabelon** med velkomstmailen — også når kaldet udtrykkeligt bad om en anden skabelon.

Det forklarer begge dele:
- Gamle lejere får velkomstmail i stedet for den normale forsendelsesmail.
- Petites Pommes fik to: én da pakken blev registreret, og én da pakken blev afsendt med PostNord (som skulle have været "forsendelse afsendt").

Desuden bliver feltet "velkomstmail sendt" på lejeren aldrig udfyldt, så der findes ingen spærre mod gentagne velkomstmail.

## Rettelse

### 1. Respekter eksplicit valgt skabelon
Når afsendelsen udtrykkeligt angiver en skabelon (fx "forsendelse afsendt" eller "ny scanning"), skal den bruges — også for brugere uden login. Velkomstmailen må kun træde til, når der ikke er valgt en skabelon.

### 2. Send kun velkomstmail én gang
Når en velkomstmail er sendt, registreres tidspunktet på lejeren. Er den allerede sendt, bruges den normale forsendelsesmail i stedet, selv hvis brugeren stadig ikke har logget ind. Mailen om "sæt din adgangskode" bliver dermed en engangsbesked.

### 3. Verificér
Efter deploy kontrolleres i e-mail-loggen, at afsendelser til lejere uden login nu logges med den korrekte skabelon, og at der kun findes én velkomstmail pr. lejer.

## Teknisk
- `supabase/functions/send-new-mail-email/index.ts`: `effectiveIsNew` må ikke overskrive et angivet `template_slug`; `needsOnboarding` skal desuden være falsk, når `tenants.welcome_email_sent_at` er sat. Efter succesfuld afsendelse af `welcome_shipment` opdateres `tenants.welcome_email_sent_at`.
- Feltet `welcome_email_sent_at` findes allerede på `tenants` — ingen databaseændringer nødvendige.
- Deploy funktionen efter ændringen.
