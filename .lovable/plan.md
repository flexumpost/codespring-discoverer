# Adresseændring: e-mails blev ikke sendt

## Hvad der skete
- Adresseændringen for "Care with you" kl. 16:15 blev gemt, og operatørerne fik en besked under notifikationer i appen.
- Der blev ikke sendt nogen e-mail, og Zoho blev ikke opdateret. Grunden er, at det næste trin aldrig blev startet: der er intet forsøg i loggen, og intet i e-mail-loggen.
- Det mest sandsynlige: det næste trin startes kun, hvis appen kan finde en bestemt systemnøgle. Den nøgle var der ikke, så trinnet blev sprunget over i stilhed. Kun det trin rammes: beskeden i appen bliver lavet før, og derfor kom den frem.

## Rettelse
1. Når adressen gemmes, starter appen selv bagefter udsendelsen af e-mails og opdateringen af Zoho, så det ikke afhænger af systemnøglen.
2. Kun de, der har adgang til lejeren, kan starte det. Kun lejerens ændringer opdaterer Zoho og sender besked til operatøren. Operatørens ændringer sender kun mailen til lejeren.
3. Gælder alle steder, man kan gemme en adresse: siden "Forsendelsesadresser", boksen "Bekræft adresse" og operatørens lejerside.
4. Send e-mails og Zoho-opdateringen for "Care with you" én gang nu, og tjek e-mail-loggen.

## Teknisk
- Udløseren i databasen beholder kun beskeden i appen. Kaldet til baggrundsfunktionen fjernes.
- Baggrundsfunktionen kræver et login: den finder brugeren og tjekker, at brugeren er operatør eller hører til lejeren. Den afgør selv, om ændringen er lavet af lejer eller operatør, ud fra brugerens rolle.
- Gemme-kode i AddressCard, ShippingAddressGuard, ShippingAddressPage, PartnerGroupAddresses og TenantDetailPage kalder funktionen, når adressen er gemt.
- Arkitekturreglen i AGENTS.md opdateres.
