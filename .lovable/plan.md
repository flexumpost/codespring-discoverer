# Plan

## Hvad jeg vil rette
- Opdatere gebyrberegningen i operator-listen, så Lite-breve med standardhandlingen `send` vises som `0 kr. + porto` på gratis forsendelsesdag i stedet for `50 kr. + porto`.
- Holde logikken i operator-visningen på linje med den allerede rettede logik i Shipping Prep og backend-billing.

## Berørte filer
- `src/pages/OperatorDashboard.tsx`

## Implementering
1. Ret `getItemFee` i `OperatorDashboard.tsx` i grenen hvor `chosen_action === default_mail_action`, så Lite + `send/forsendelse` returnerer `0 kr. + porto`.
2. Gennemgå samme funktions øvrige `send/forsendelse`-grene, så visningen ikke er inkonsistent mellem standardforsendelse og ekstraforsendelse.
3. Verificere mod de konkrete eksempler (#3056, #3062, #3072, #3073), som alle er Lite med `chosen_action='send'` og `default_mail_action='send'`.

## Teknisk note
- Årsagen er ikke databasen: de fire viste forsendelser er korrekt registreret som Lite og med standardhandlingen `send`.
- Fejlen ligger i frontend-visningen på operator-dashboardet, hvor Lite stadig er hardcoded til `50 kr. + porto` i netop den kodevej.