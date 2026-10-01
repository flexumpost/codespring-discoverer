# Forkert gebyr på 50 kr. ved gratis forsendelse (Lite)

## Årsag

Vej & Leg ApS og Prolific Holding ApS er Lite-lejere. Brevene 3743, 3752, 3755 og 3756 stod alle på "Standard forsendelse", altså gratis forsendelse med porto lagt oveni.

Når operatøren trykker "Send" under "Send breve og pakker", sker der to ting i denne rækkefølge:
1. Handlingen på brevene overskrives fra "Standard forsendelse" til "Under forsendelse".
2. Derefter beregnes gebyret til OfficeRnD.

Beregningen ser kun den nye handling og opfatter brevet som en **ekstra forsendelse**, og den koster 50 kr. for Lite. At brevet var en gratis standardforsendelse, er glemt på det tidspunkt. Portoen (18,40 kr.) er korrekt.

Det er altså ikke datoen, der er skyld i fejlen. 3. september var 1. torsdag i måneden, og 2. september lå i samme forsendelsesrunde.

## Andre berørte lejere

Samme fejl har ramt disse Lite-lejere siden juli:
- Damsgaard Byg og Service ApS (6 breve, 5. aug til 2. sep)
- VENTUNO247 (5 breve, 5. aug til 2. sep)
- Prolific Holding ApS (2 breve, 2. sep)
- Vej & Leg ApS (2 breve, 3. sep)
- Nordengen ApS, Momentum Trading, Agile Design ApS (1 brev hver)

Breve fra samme forsendelse er slået sammen til ét gebyr pr. lejer pr. forsendelsesdag. Derfor er det ét gebyr på 50 kr. pr. lejer pr. dag.

## Løsning

1. **Behold den oprindelige handling:** Ved "Send" overskrives "Standard forsendelse" ikke længere. Kun breve, der reelt var bestilt som ekstra forsendelse, får gebyret.
2. **Sikkerhedsnet i gebyrberegningen:** Hvis brevets historik viser, at det var "Standard forsendelse" lige før afsendelsen, beregnes 0 kr. + porto.
3. **Allerede overførte gebyrer:** Et gebyr, der først er oprettet i OfficeRnD, kan jeg ikke slette derfra. Gebyrerne skal krediteres manuelt i OfficeRnD. Jeg laver en liste med lejer, dato og frimærkenumre, så de er nemme at finde.

## Teknisk

- `src/pages/ShippingPrepPage.tsx` (DAO og PostNord): sæt kun `status`. Behold `chosen_action` når den er `standard_forsendelse`; sæt ellers `under_forsendelse` som i dag.
- `sync-officernd-charge-batch` og `sync-officernd-charge`: i `calculateFee` returneres `standard_forsendelse` for breve allerede som 0 kr. + porto. Før beregningen slås seneste `action_chosen`-log op, og har den `old_value = 'standard_forsendelse'`, behandles brevet som `standard_forsendelse`. Begge funktioner redeployes.
- Kontrollér at "Sendt"-tællere og farver i `OperatorDashboard`/`mailRowColor` også genkender `standard_forsendelse` på sendte breve. De bruger allerede `status`, så det skal kun bekræftes.
