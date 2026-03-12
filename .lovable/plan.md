
Målet er at gøre “Vælg handling” tilgængelig igen for brev 2817 og lignende tilfælde.

1) Årsag (bekræftet)
- I `src/pages/TenantDashboard.tsx` låses handlinger med:
  - `shippingDate = getNextShippingDate(...)`
  - `isLocked = today >= packingDay`
  - og derefter vises kun `Arkivér`.
- For brev 2817 er lejerens standardhandling `afhentning` (Plus), men låsningen beregnes stadig ud fra forsendelsesdato (torsdag).  
- Når dagen er torsdag, bliver `isLocked` sand, og dropdown skjules — derfor kan handling ikke vælges.

2) Implementeringsplan
- Opdater låselogikken i handlingskolonnen, så den kun låser, når den **effektive handling er “send”** (forsendelsesflow).
- Behold `scanExpired`-lås uændret.
- For standard `afhentning`/`scan` skal dropdown fortsat vises, så lejer kan vælge alternativ handling.

3) Konkret kodeændring (i samme fil)
- Beregn `defaultAction` og `effectiveAction` **før** lock-check:
  - `effectiveAction = item.chosen_action ?? defaultAction ?? fallback`
  - fallback for Lite/Standard/Plus uden default: `"send"`.
- Erstat nuværende lock-condition:
  - Fra: lås næsten alle ikke-scan handlinger
  - Til: `isLockedForShipping = effectiveAction === "send" && today >= packingDay`
- Bevar resten af rendering-flowet:
  - Hvis låst for shipping → kun `Arkivér`
  - Ellers vis ekstra handlinger (filtreret for standardhandling), som allerede implementeret.

4) Forventet adfærd efter fix
- Brev 2817 (default `afhentning`) får igen dropdown med ekstra handlinger (fx `scan`, `send`) i stedet for kun `Arkivér`.
- Hvis en forsendelse reelt er i “send”-flow tæt på forsendelsesdag, forbliver den låst som ønsket.
- “Sendes” vises fortsat ikke som ekstra mulighed, når det er standardhandling.

5) Verifikation
- Test med Plus-lejer med `default_mail_action = afhentning`:
  - “Vælg handling” skal være synlig.
- Test med Plus/Lite hvor effektiv handling er `send` tæt på forsendelsesdag:
  - kun `Arkivér` vises.
- Test at status-tekster forbliver:
  - `Kan afhentes` (default afhentning)
  - `Brevet scannes` + dato (default scan)
  - `Sendes på næste forsendelsesdag` + dato (default send).
