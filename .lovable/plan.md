## Problem

Lite-lejere som **brAlght ApS** (stamp #3056 og #3073) bliver opkrævet **"50 kr. + porto"** for breve den 7. maj, selv om første torsdag i måneden er deres gratis forsendelsesdag og de derfor kun skulle betale **"0 kr. + porto"** (kun porto).

## Årsag

I databasen ligger de berørte forsendelser sådan her:

- `mail_type = 'brev'`
- `chosen_action = 'send'`  ← bemærk: ikke `'standard_forsendelse'`
- `default_mail_action = 'send'`
- `tier = 'Lite'`

Pris-logikken har to grene afhængigt af om handlingen hedder `standard_forsendelse` eller bare `send`:

1. `**standard_forsendelse`-grenen** (eksplicit "standard / gratis" valg): returnerer korrekt **"0 kr. + porto"** for breve uanset tier.
2. `**send`-grenen** (almindelig forsendelse): returnerer **"50 kr. + porto"** for Lite, **"0 kr. + porto"** for Standard, **"0 kr."** for Plus.

For Lite-lejere skal første torsdag i måneden ("standardforsendelsesdag") også være gratis i `send`-grenen — ikke kun når handlingen hedder `standard_forsendelse`. Når `chosen_action === default_mail_action === 'send'` for en Lite-lejer på et brev, er det reelt en standardforsendelse og bør koste **"0 kr. + porto"**.

Den tidligere `if (item.chosen_action === defaultAction)`-gren forsøger faktisk dette, men returnerer alligevel `"0 kr."` (uden porto) for Lite, fordi grenen kun behandler Standard som "0 kr. + porto". Den efterfølgende generelle `send`-gren overskriver så til "50 kr. + porto" — bug nr. to.

Samme fejl findes tre steder, der skal holdes synkrone:

- `src/pages/ShippingPrepPage.tsx` — `getShippingFee()` (visning på forsendelses-siden, det er den her brugeren ser).
- `supabase/functions/sync-officernd-charge/index.ts` — `calculateFee()` (debiterer OfficeRnD).
- `supabase/functions/sync-officernd-charge-batch/index.ts` — `calculateFee()` (debiterer OfficeRnD i batch ved torsdags-forsendelse).

Desuden i `src/pages/TenantDashboard.tsx` (lejer-portalens visning) findes samme `tier === "Lite" → "50 kr. + porto"` for `send` på linjerne 189, 243 m.fl., som bør tjekkes for konsistens.

## Løsning

Behandl en Lite-lejers `send` som gratis forsendelse (kun porto) når det er deres standardhandling, dvs. når `chosen_action === default_mail_action` for breve.

Konkret ændring i alle tre fee-funktioner:

I `send`/`forsendelse`-grenen for breve, returner:

- Lite: **"0 kr. + porto"** hvis `chosen_action === default_mail_action` (= standardforsendelse), ellers fortsat **"50 kr. + porto"** (ekstra forsendelse uden for gratisdag).
- Standard: uændret "0 kr. + porto".
- Plus: uændret "0 kr.".

I `ShippingPrepPage.tsx` betyder det at den eksisterende `if (item.chosen_action === defaultAction)`-gren skal returnere `"0 kr. + porto"` for Lite (i dag returnerer den `"0 kr."`), og at den efterfølgende generelle `send`-gren skal beholde `"50 kr. + porto"` for Lite (det er den korrekte pris for Lite-`send` der IKKE er på gratisdag).

I `sync-officernd-charge*` skal samme logik ind: tilføj `defaultAction`-tjek i `send`-grenen for breve så Lite med `chosenAction === defaultAction` giver `{ amountKr: 0, amountText: "0 kr. + porto" }`.

## Verificering

- De to konkrete forsendelser (#3056, #3073) skal vise "0 kr. + porto" på forsendelses-siden efter ændringen.
- En Lite-lejer der manuelt ændrer en forsendelse til `send` (uden at det er deres default) skal fortsat se "50 kr. + porto".
- Standard og Plus skal være uændret.
- Allerede sendte/debiterede forsendelser i OfficeRnD skal håndteres separat (manuel kreditering eller scriptet retting) — det er uden for dette fix.

## Spørgsmål inden implementering

1. Skal jeg også justere `TenantDashboard.tsx` (lejer-portalens prisvisning) i samme omgang, så lejeren ser den samme rettede pris? - JA
2. Skal jeg lave en SQL-rapport over alle Lite-breve sendt 7. maj med chosen_action='send' og default_mail_action='send', så I kan kreditere dem manuelt i OfficeRnD? - JA