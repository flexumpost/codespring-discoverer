## Årsagen er den samme for begge tal

Tællerne på kortene i operatør-dashboardet ser ikke på **status** — de tæller også forsendelser, der for længst er arkiveret.

**"Åben og scan" = 7**
- 1 reel: nr. 3620 (ROADRUNNERCARGO APS, "Scan nu")
- 6 arkiverede breve uden scan-fil: nr. 3261, 3255, 3254, 3247, 3246 (Management Company K/S) og 2954 (ROADRUNNERCARGO APS). Alle er Plus-lejere med standardhandling "scan" og uden valgt handling. Plus bruger "næste torsdag", og da i dag *er* torsdag, tælles de med.

**"Send" = 8**
- 6 reelle: nr. 3627, 3625, 3622, 3617, 3615 (breve) og 3597 (pakke)
- 2 arkiverede breve med handlingen "send": nr. 3187 (SHINEPRO APS) og 2984 (TRUE CONTRACTORS APS)

Begge afvigelser er altså gamle, arkiverede forsendelser, der stadig tælles med.

## Ændring

I `src/pages/OperatorDashboard.tsx`:

1. Alle `countFilter`-funktioner på kortene får som første betingelse, at forsendelsen ikke er færdigbehandlet — genbrug af den eksisterende `isUnprocessed(item)` (udelukker status `arkiveret`, `sendt_med_dao`, `sendt_med_postnord`, `sendt_retur`, samt `chosen_action = "afhentet"` og forsendelser der allerede har en scan-fil).
2. Kortene uden `countFilter` ("Ikke tildelt" og "Læg på kontoret") får samme behandling, så alle seks tal er konsistente.
3. Listefiltrene (`filter`) røres ikke — når man klikker på et kort, kan operatøren fortsat se historikken, inkl. afsendte/arkiverede.

Efter ændringen vil kortene vise **1** for "Åben og scan" og **6** for "Send".

## Bemærkning

Bagvedliggende data er ikke forkerte — de 8 gamle arkiverede forsendelser er reelt afsluttede. Der er derfor ingen databaseændring i denne opgave.
