# Pakke-specifikke tekster i "Vælg handling"

Handlingskortene i dialogen bruger i dag de samme tekster for breve og pakker, så en pakke omtales som "Brevet" og afhentning kaldes "Standard afhentning" selvom pakker kan hentes alle dage.

## Ændringer

Kun for `mail_type = "pakke"` — breve beholder deres nuværende tekster uændret.

Afhentning:

- Titel: "Afhentning" (i stedet for "Standard afhentning")
- Beskrivelse: "Book et afhentningstidspunkt for at hente din pakke"
- Knap: "Book afhentning"
- Ingen dato-linje på kortet, da pakker ikke er bundet til en fast dag

Destruktion:

- Beskrivelse: "Pakken bliver destrueret. Handlingen kan ikke fortrydes."
- Knap: "Destruer pakken"

Forsendelse:

- Beskrivelse tilrettet så der står "Pakken sendes ..." i stedet for "Brevet sendes ..."

Annullér valg / arkivér / genaktivér: neutrale tekster, ændres ikke.

Priser, valgmuligheder og booking-flowet ændres ikke — pakker åbner allerede booking-dialogen med fri datovalg.

## Teknisk

- Tilføj en `chooseActionPackage`-sektion i `src/i18n/locales/da.json` og `en.json` med pakke-varianter af `standardPickup`, `destroy` og `standardSend`.
- I `src/lib/mailActions.ts`: lad `makeCard` vælge nøgle-prefix ud fra `mailType` (`chooseActionPackage.*` med fallback til `chooseAction.*`), og undlad `dateText` for pakke-afhentning.