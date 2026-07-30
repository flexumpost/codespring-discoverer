## Hvorfor mangler brev 3618?

Brev 3618 (Svartstrand ApS, Standard) har status `ny` og **ingen valgt handling**. Listen "Send breve og pakker" viser kun forsendelser med en handling (valgt af lejeren eller sat automatisk), så 3618 falder udenfor.

Årsagen er lejerens automatisering: Svartstrand ApS har ingen standardhandling for breve (`default_mail_action` er tom). Databasetriggeren, der sætter handlingen ved registrering, gør følgende:

- Pakker: hvis lejeren ikke har valgt noget, bruges "Forsendelse" (send) automatisk.
- Breve: hvis lejeren ikke har valgt noget, sættes **ingen** handling — brevet bliver liggende som `ny`.

Til sammenligning har 3617 og 3615 handlingen `send` og er derfor med på listen.

Dette rammer bredt: 68 ud af 245 aktive lejere har ingen standardhandling for breve.

## Ændring

Gør "Forsendelse" til den reelle standard for breve, på linje med pakker og med det, brugerfladen allerede kommunikerer.

1. Migration: opdater `apply_tenant_default_action` så breve falder tilbage til `send`, når lejeren ikke har valgt en standardhandling — med samme tier-regel som i dag (Lite bliver til `standard_forsendelse`, øvrige `send`). Adfærd for `scan` og `afhentning` er uændret.
2. Samme migration: sæt handlingen på eksisterende ubehandlede breve uden valgt handling (status `ny`, ingen scan-fil, lejer uden standardhandling), så bl.a. 3618 kommer med på sendelisten.

## Teknisk note

Kun triggerfunktionen og et engangs-`UPDATE` på `mail_items` ændres. Ingen frontend-ændringer er nødvendige — `ShippingPrepPage` bruger `chosen_action` og lejerens standardhandling, som begge bliver korrekte efter ændringen.

## Alternativ

Hvis du hellere vil undgå automatik, kan vi i stedet blot udfylde `default_mail_action = 'send'` på de 68 lejere, der mangler den. Så gælder ændringen kun fremadrettet for nye breve.
