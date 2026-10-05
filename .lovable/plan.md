# Automatisering for breve og pakker

## Hvad lejeren ser (Automatisering-siden og "Vis som lejer")

To sektioner: **Breve** og **Pakker**. Hver har sine egne valg, og der er én "Gem"-knap.

Breve:
- **Forsendelse**: "Nye breve sættes til forsendelse på først kommende gratis forsendelsesdag."
- **Scanning**: "Nye breve scannes på først kommende gratis scanningsdag."
- **Afhentning** (ny): "Nye breve sættes til afhentning på først kommende gratis afhentningsdag. Du vælger et fast tidsrum herunder. Tidspunktet kan altid ændres på det enkelte brev på forsiden."
  - Når Afhentning er valgt, vises en liste med tidsrum (de samme hele timer som i booking-dialogen). Du kan ikke gemme, før du har valgt et tidsrum.

Pakker:
- **Forsendelse**: "Nye pakker sættes til forsendelse på først kommende forsendelsesdag."
- **Afhentning** (ny): samme opsætning og eget fast tidsrum.

Standard for både breve og pakker er **Forsendelse**, indtil lejeren eller operatøren ændrer det. Nuværende lejere uden valg bliver sat til Forsendelse. Lejere der allerede har valgt Scanning, beholder Scanning.

Den nuværende pop-up "Vælg standardhandling" for nye lejere bliver overflødig, fordi Forsendelse nu er sat fra start. Den fjernes.

## Når et brev eller en pakke registreres med Afhentning som standard

- Handlingen bliver sat til gratis afhentning på først kommende gratis afhentningsdag for lejerens løsning, med lejerens faste tidsrum. Eksempel: Standard → næste mandag eller torsdag kl. 10-11.
- Hvis tidsrummet på den dag ikke kan bookes (lukket dag, ferieperiode med særlige tider eller mindre end 2 timer til), vælges den næste gratis dag, hvor tidsrummet kan bookes.
- Lejeren får en e-mail: "Du kan hente dit brev/din pakke [dag dato] kl. [tidsrum]. Du kan ændre tidspunktet i din digitale postkasse." med et link. Den sendes i stedet for den almindelige mail om ny post, så lejeren kun får én mail.
- Operatørens oversigt viser afhentningen som en almindelig booket afhentning.

## Åbent punkt: pakker
Pakker kan hentes alle hverdage. Planen lægger derfor pakke-afhentning på **først kommende hverdag** med det faste tidsrum og uden gebyr. Hvis pakker i stedet skal følge løsningens gratis dage (fx mandag og torsdag for Standard), eller hvis der skal opkræves pakkegebyr, så sig til.

## Teknisk
- Migration: `tenants.default_mail_pickup_hour int`, `default_package_pickup_hour int` (null eller 7-18). Opdatér `validate_tenant_default_actions`, så den tillader 'afhentning' og kræver en time, når 'afhentning' er valgt. Kolonne-standard for `default_mail_action` og `default_package_action` sættes til 'send'. Backfill null til 'send' (run_sql).
- `apply_tenant_default_action`: ved 'afhentning' beregnes `pickup_date` (gratis dag via base tier: Lite 1. torsdag, Essential torsdag, Standard/Professional man+tor, Plus/Executive næste hverdag; pakker næste hverdag). Lukkede dage springes over via `closed_days`. Sæt `chosen_action` = 'gratis_afhentning' for breve og 'afhentning' for pakker. Mindst 2 timers buffer.
- Ferieperiode-vinduer (`SPECIAL_PICKUP_WINDOWS`) findes kun i frontend. Triggeren springer de datoer over, hvor timen ligger uden for vinduet. Vinduerne spejles ind i SQL-funktionen.
- `AutomationCard.tsx`: omskrives med sektioner for breve og pakker, tidsrumsvalg og validering. Nye i18n-nøgler i da/en.
- `send-new-mail-email`: når `chosen_action` er afhentning og `pickup_date` er sat, bruges en ny skabelon `pickup-scheduled` (dansk/engelsk tekst, link til forsiden) i stedet for `new-shipment`.
- Memory opdateres: "Forsendelse er eneste standard for pakker" og "afhentning kan ikke være standard" udgår.
