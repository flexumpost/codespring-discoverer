# Gebyr for afhentning hos Altbyg.dk — årsag og rettelse

## Hvad der skete

Altbyg.dk (Lite) fik i dag afhentet 5 breve. Ét gebyr på 50 kr. blev overført til OfficeRnD (de øvrige 4 blev korrekt slået sammen og logget som "0 kr. (samlet afhentning)").

Historikken på brevene viser årsagen:

- Kl. 07:11 satte operatøren handlingen til `afhentning` (betalt afhentning på valgfri dag).
- Lejerens egne tidligere valg på andre breve står som `gratis_afhentning` (gratis afhentning på standarddagen).
- Gebyrberegningen prissætter `afhentning` til 50 kr. for Lite, mens `gratis_afhentning` er 0 kr. Den kender ikke datoen — den ser kun handlingsnavnet.

Så det er ikke en fejl i beregningen, men i valget: operatørdialogen tilbyder kun én afhentnings-mulighed ("Skift til afhentning"), som altid er den betalte variant. Der findes ingen måde for operatøren at registrere en gratis afhentning på standarddagen.

## Løsning

### 1. Operatørens valgmulighed opdeles
I dialogen for en forsendelse (operatørvisning) erstattes den ene "Afhentning"-mulighed for breve med to:
- Gratis afhentning (standarddag) — 0 kr.
- Afhentning anden dag — gebyr efter lejertype (50/30/0 kr.)

For pakker er afhentning altid gebyrbelagt, så der ændres intet.

### 2. Sikkerhedsnet i gebyrberegningen
I `sync-officernd-charge` behandles `afhentning` på et brev som gratis, når afhentningsdatoen falder på lejerens standard-afhentningsdag (1. torsdag i måneden for Lite, førstkommende torsdag for Standard). Så koster en afhentning på standarddagen 0 kr., også hvis handlingen registreres manuelt.

### 3. Dagens gebyr
Det allerede overførte gebyr på 50 kr. skal krediteres/slettes manuelt i OfficeRnD — Lovable kan ikke fjerne en allerede oprettet charge. Alternativt kan jeg nulstille sync-loggen, så beløbet kan genberegnes efter rettelsen; sig til hvis det ønskes.

## Teknisk

- `src/components/OperatorMailItemDialog.tsx`: to `SelectItem`s (`gratis_afhentning` / `afhentning`) i stedet for én, kun for `mail_type = 'brev'`; nye i18n-nøgler i `da.json`/`en.json`.
- `supabase/functions/sync-officernd-charge/index.ts`: i `calculateFee` for breve med `chosenAction === "afhentning"` returneres 0 kr., når `pickup_date`/arkiveringsdato matcher lejertypens standard-afhentningsdag; datohjælper efter samme regler som `getFirstThursdayOfMonth` / `getNextThursday` i `src/lib/mailActions.ts`.
- Funktionen redeployes.
