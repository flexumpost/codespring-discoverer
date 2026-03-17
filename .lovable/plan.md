
Status lige nu: Det er stadig et problem for den adresse (ikke utålmodighed).

Hvad jeg har verificeret:
- Seneste reset-forsøg rammer backend, men fejler med `User with this email not found` (kl. 16:40 og 16:41).
- `regnskab@flexum.dk` findes som kontaktmail på lejeren `Care With You`, men lejeren har `user_id = null` (ingen koblet login-bruger).
- Der findes ingen auth-bruger med `regnskab@flexum.dk`.
- Derfor kan recovery-link ikke genereres og der sendes ingen ny mail.

Plan for løsning (hurtigst muligt):
1. Genskab login-brugeren for `regnskab@flexum.dk` via invitation (samme flow som “opret postmodtager” / invite).
2. Bekræft at brugeren er oprettet og koblet til lejer (så reset-flowet har en reel konto at nulstille).
3. Kør “Glemt adgangskode” igen og verificér:
   - mail dukker op i indbakken
   - ny `recovery`-log med `pending` -> `sent` i mail-loggen.

Forebyggelse (så det ikke sker igen):
- Tilføj tydeligere tekst i login-flowet: “Hvis kontoen ikke findes endnu, skal du bruge invitation først.”
- Tilføj en tydelig “Send invitation igen”-handling på lejer/postmodtager, så man ikke bruger reset på en ikke-oprettet konto.
- (Valgfrit) log `user_not_found` reset-forsøg i en intern fejllog, så support kan se årsagen med det samme.

Teknisk scope:
- Ingen database-migrering nødvendig for den hurtige løsning.
- Forbedringerne kræver primært UI-justeringer i login/indstillinger samt mindre backend-logning.
