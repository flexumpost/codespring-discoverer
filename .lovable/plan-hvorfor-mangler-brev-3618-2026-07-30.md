## Hvorfor mangler brev 3618?

Brev 3618 (Svartstrand ApS, Standard) har status `ny` og **ingen valgt handling**. Listen "Send breve og pakker" viser kun forsendelser med en handling, så 3618 falder udenfor.

Årsagen er automatikken ved registrering:

- Pakker: falder automatisk tilbage til "Forsendelse", hvis lejeren ikke har valgt en standardhandling.
- Breve: har ingen fallback — hvis lejeren ikke har valgt en standardhandling, får brevet slet ingen handling.

Svartstrand ApS har ingen standardhandling for breve. 68 ud af 245 aktive lejere er i samme situation.

## Ændring: Forsendelse som standard for alt

Standardhandlingen for både breve og pakker bliver altid **Forsendelse på næste gratis forsendelsesdag**, medmindre lejeren aktivt vælger noget andet.

1. Opdater databasefunktionen `apply_tenant_default_action`, så breve uden lejer-valgt standardhandling falder tilbage til forsendelse — med den eksisterende tier-regel: Lite får `standard_forsendelse` (1. torsdag i måneden = gratis dag), Standard og Plus får `send`. Pakker er uændrede.
2. Sæt handlingen på eksisterende ubehandlede breve, der mangler den: status `ny`, ingen valgt handling, ingen scan-fil, tildelt en lejer. Samme tier-regel. Brev 3618 kommer dermed med på sendelisten.

Lejerens egne valg (scan, afhentning m.m.) og lejerens egen standardhandling i Automatisering respekteres fortsat og overskrives ikke.

## Teknisk

- Migration: `CREATE OR REPLACE FUNCTION public.apply_tenant_default_action()` — fjern det tidlige `RETURN NEW`, når `default_mail_action` er tom, og sæt i stedet `_default_action := 'send'` for breve.
- Data-opdatering: `UPDATE public.mail_items` for de berørte breve, som også sætter status til `afventer_handling`.
- Ingen frontend-ændringer nødvendige — `ShippingPrepPage` og operatør-dashboardet læser `chosen_action`.
