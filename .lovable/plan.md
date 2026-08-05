# Zoho-styret livscyklus for digitale postkasser

Webhooken fra Zoho skal fremover styre både oprettelse og ophør af en lejer ud fra feltet "Kunde status" på Account.

## Sådan skal det virke

### Kunde status = "Aktiv adresseservice"
1. Opret lejer hvis den ikke findes:
   - Firmanavn = Account Name
   - Kontakt-email = Kontaktperson E-mail
   - Fornavn / efternavn = Kontaktperson fornavn / efternavn
   - Lejertype = værdien i "Løsning kort" (matches mod lejertyperne Lite, Standard, Plus, Fastlejer, Nabo; fald tilbage til Lite hvis ingen match)
2. Overfør forsendelsesadressen fra Zoho (modtager, c/o, adresse, adresse 2, postnr., by, region, land). Adressen markeres som bekræftet, når de påkrævede felter er udfyldt.
3. Send velkomstmail til kontakt-emailen (samme flow som i dag, med 24-timers link til at sætte adgangskode).
4. Findes lejeren allerede (samme firmanavn), opdateres kontaktoplysninger, adresse og lejertype i stedet for at oprette en dubletlejer — og lejeren genaktiveres, hvis den var deaktiveret. Velkomstmail sendes kun, hvis den ikke er sendt før.

### Kunde status = "Ophørt samarbejde"
- Find lejeren på firmanavn (Account Name).
- Sæt lejertype = "Retur til afsender" og deaktiver lejeren (is_active = false).
- Eksisterende databasetrigger sørger for, at ny indgående post automatisk markeres som sendt retur.
- Findes ingen lejer med det firmanavn, logges det og webhooken svarer OK (ingen fejl til Zoho).

### Andre statusværdier
Ignoreres — webhooken svarer OK uden ændringer, så Zoho ikke får fejl.

## Teknisk

Alt sker i `supabase/functions/zoho-crm-webhook/index.ts`:

- Læs status fra flere mulige feltnavne, da det præcise navn ikke er kendt endnu: `kunde_status`, `Kunde_status`, `Kunde_Status`, `customer_status`, `status`, `Status`. Sammenligning sker uden hensyn til store/små bogstaver og mellemrum.
- Løsning-kort læses fra `solution_short` (og `Løsning_kort` / `losning_kort` som alias), med `package_solution` som fallback — i dag bruges kun `package_solution` til typeopslag.
- Opslag af eksisterende lejer sker på `company_name` (case-insensitivt), i stedet for dagens dublettjek på firmanavn + email.
- Ved manglende/ukendt status bevares dagens adfærd (opret lejer), så eksisterende Zoho-flows ikke går i stykker.
- Ekstra logning af modtaget status og valgt handling, så vi kan se det rigtige feltnavn i funktionsloggen efter første kald og finjustere.

Ingen databaseændringer er nødvendige.
