## Problem

Lite-brevet med stempel 3489 (chosen_action = `standard_forsendelse`, Roepkjær ApS) står ikke under "torsdag 2. juli 2026" på **Send breve og pakker**, selvom 2. juli **er** første torsdag i juli.

Årsag ligger i `src/pages/ShippingPrepPage.tsx`:

- `getNextShippingDateForItem(...)` for Lite-breve returnerer `getFirstThursdayOfMonth(now)` **kun hvis `firstThurs > today`**. Da dagens dato (2. juli) er lig med første torsdag, springer logikken videre til næste måneds første torsdag (6. august).
- Samme problem i den generelle gren (`daysUntil = (4 - dow + 7) % 7 || 7`): når dagen `er` torsdag, giver `|| 7` én uge frem i stedet for i dag.
- `getDefaultShippingDate()` har samme "|| 7"-fejl, så default-dato på en torsdag hopper til næste torsdag.

Effekt: onsdag virker (firstThurs = i morgen > i dag), men torsdag (hvor brugeren også skal kunne klargøre) skjuler brevene.

## Ændring

### `src/pages/ShippingPrepPage.tsx`

1. `getDefaultShippingDate()` — fjern `|| 7`, så `daysUntil = (4 - dow + 7) % 7`. På en torsdag defaulter siden til i dag; øvrige dage uændret.
2. `getNextShippingDateForItem(tenantTypeName, mailType)`:
   - Generel gren (pakker + ikke-Lite breve): samme fix — fjern `|| 7` så torsdag = i dag.
   - Lite-brev gren: skift `if (firstThurs > today)` til `if (firstThurs >= today)`, så første torsdag i måneden også tælles når den er i dag.

Ingen ændring af filter, gruppering, mutation, eller andre komponenter. Onsdags-klargøring virker som før (firstThurs = i morgen). Torsdags-klargøring virker nu også.

## Ikke-mål
- Ingen ændring af backend, RLS, eller edge functions.
- Ingen ændring af `mailActions.ts` (tenant-siden viser stadig "Skal sendes Torsdag den 2. juli" korrekt).
- Ingen tekst-/oversættelsesændringer.
