# Vej & Leg ApS kan ikke logge ind (mark@vejogleg.dk)

## Hvad vi har sendt

Til **mark@vejogleg.dk** er der ikke sendt nogen e-mails. Alt er gået til **markb89dk@gmail.com**:

- 31. aug – 3. sep: 5 velkomstmails med link til at oprette adgangskode (alle udløbet efter 24 timer, ingen brugt)
- 4. sep: 2 velkomstmails fra CRM-opdateringen
- 8. sep: link til at nulstille adgangskode. Linket blev åbnet, men der blev ikke logget ind bagefter.
- 21. sep – 1. okt: notifikationer om nye forsendelser og afsendte forsendelser

## Årsag

Lejerens login-konto står på **mark@vejogleg.dk**, men vores mails har givet links til **markb89dk@gmail.com**. Linket til at oprette adgangskode passer derfor ikke til den konto, han skal logge ind med. Han har aldrig været logget ind.

## Rettelse

1. Send et nyt link til at oprette adgangskode til **mark@vejogleg.dk**. Det er den adresse, kontoen står på.
2. Fremover sendes link til at oprette adgangskode og nulstille adgangskode altid til den e-mail, login-kontoen står på. Så kan links og konto ikke pege på to forskellige adresser.
3. Lejere med samme problem findes og vises i en liste. Det er lejere, hvor kontaktmailen og login-kontoens e-mail ikke er den samme.

## Tekniske detaljer

- `send-welcome-email`, `send-new-mail-email` (welcome_shipment), `zoho-crm-webhook` og `request-password-reset`: opret `onboarding_tokens` og sæt modtager ud fra `auth.users.email` for lejerens `user_id`, i stedet for `contact_email`.
- Engangskørsel: opret token og send velkomstmail til mark@vejogleg.dk.
- Forespørgsel: `tenants.contact_email` forskellig fra `profiles.email` for `user_id`.
