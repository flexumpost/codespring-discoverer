# Hvorfor kan Dalia (kislor.therapy@gmail.com) ikke logge ind

## Bekræftet årsag

Der findes slet ingen brugerkonto på hendes e-mail. Lejeren "Kislor Therapy" blev oprettet automatisk fra CRM i nat kl. 00:28, og velkomstmailen blev sendt — men mailen henviser kun til login-siden, og der blev aldrig oprettet en konto eller et link til at vælge adgangskode. Derfor fejler login: der er ikke noget at logge ind på.

Det er ikke et enkeltstående tilfælde. Disse lejere fra CRM mangler også en brugerkonto:

- Kislor Therapy (kislor.therapy@gmail.com)
- OMG Technologies ApS og OMG Investment Group (ahj@senature.com)
- Simple Works Lab (henrik@simpleworkslab.com)
- Nemlet (robertorlanderpedersen@gmail.com)

Lejere oprettet manuelt i operatørpanelet får konto og invitationslink som de skal — fejlen ligger kun i den automatiske oprettelse fra CRM.

## Ændringer

1. **Opret brugerkonto automatisk fra CRM**
   - Når CRM opretter en ny lejer med kontakt-e-mail, oprettes også en brugerkonto, tildeles lejer-rolle, kobles til lejeren, og lejerens ejerfelt sættes.
   - Findes e-mailen allerede som bruger, genbruges den konto i stedet for at oprette en ny.

2. **Velkomstmailen skal indeholde et "opret adgangskode"-link**
   - Samme 24-timers link som ved manuelle invitationer, i stedet for kun et link til login-siden.
   - Fejler oprettelsen, logges det i Zoho-loggen som "fejlet", så det kan ses i indstillingerne.

3. **Ret de 5 eksisterende lejere**
   - Opret konti og send et nyt velkomst-/adgangskodelink til de fem adresser ovenfor, så de kan komme ind.

## Tekniske detaljer

- `supabase/functions/zoho-crm-webhook/index.ts`: kald bruger-oprettelse (som `create-tenant-user` i `invite_silent`-tilstand) før velkomstmailen, og generér et `onboarding_tokens`-link, der sendes med i mailen (`recoveryLink`).
- Backfill af de fem lejere køres efter deploy.
