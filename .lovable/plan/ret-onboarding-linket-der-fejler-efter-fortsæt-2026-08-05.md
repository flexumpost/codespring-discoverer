# Ret onboarding-linket, der fejler efter “Fortsæt”

## Bekræftet årsag

Majs 24-timers-link var gyldigt til 6. august, men blev markeret som brugt 5. august kl. 08:37. Hendes konto er stadig ubekræftet og har aldrig været logget ind.

Fejlen sker mellem “Fortsæt” og adgangskodeformularen:

- Backend genererer en token-hash.
- Siden sender hashværdien som en almindelig OTP-kode i stedet for som `token_hash`, så godkendelsen fejler.
- Backend har allerede markeret onboarding-linket som brugt. Næste forsøg ender derfor straks på “linket er udløbet”.

## Ændringer

1. **Ret token-godkendelsen på “Sæt adgangskode”**
   - Send den genererede hash i det korrekte `token_hash`-felt.
   - Brug den verificeringstype, backend returnerer.

2. **Undgå at ødelægge linket ved en teknisk fejl**
   - Lad ikke `consume-onboarding-token` markere 24-timers-tokenet som brugt, før login-sessionen faktisk er oprettet.
   - Tilføj et afsluttende, autentificeret kald, som markerer tokenet brugt efter vellykket verificering.
   - Kontrollér i backend, at den indloggede brugers e-mail matcher tokenets e-mail.

3. **Bedre fejlhåndtering**
   - Skeln mellem reelt udløbet/brugt link og en teknisk godkendelsesfejl, så brugeren ikke fejlagtigt får beskeden “linket er udløbet”.
   - Bevar muligheden for at prøve igen, hvis sessionen ikke blev oprettet.

4. **Test og genudsend**
   - Deploy den rettede onboarding-funktion.
   - Test hele flowet: link → Fortsæt → opret adgangskode → login.
   - Send Maj et nyt link, fordi hendes nuværende token allerede er markeret som brugt.
   - Kontrollér, at hendes konto bliver bekræftet, og at login lykkes.

## Tekniske filer

- `src/pages/SetPasswordPage.tsx`
- `supabase/functions/consume-onboarding-token/index.ts`