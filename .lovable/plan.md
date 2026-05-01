## Problem

Forsendelse **3140** (Wise Click ApS, Standard-tier) blev automatisk sat til `chosen_action = "scan"` med 30 kr. gebyr, fordi lejeren har valgt **"Scanning"** som standardhandling for breve.

Sådan fungerer det i dag:

- Lejeren vælger "Scanning" i `DefaultActionSetup` → gemmes som `default_mail_action = "scan"` på tenant.
- DB-triggeren `apply_tenant_default_action` kopierer værdien direkte ind i `chosen_action` på hver nye mail item.
- Edge function `sync-officernd-charge` ser `chosen_action = "scan"` og fakturerer 30 kr. (Standard-tier) / 50 kr. (Lite).

Systemet har allerede konceptet `**standard_scan**` = "scan på næste planlagte gratis scandag" (0 kr.). Det er bare ikke det, som triggeren falder tilbage på.

## Løsning

Når en lejer vælger "Scanning" som standardhandling for breve, skal nye breve sættes til `**standard_scan**` (gratis, næste planlagte scandag). Lejeren kan derefter selv ændre til `**scan**` (med det samme, mod gebyr) hvis de ønsker det.

### Ændringer

**1. DB-migration — opdater `apply_tenant_default_action`-triggeren**

Map default-værdien til den gratis variant for breve:

- `default_mail_action = 'scan'` → sæt `chosen_action = 'standard_scan'`
- `default_mail_action = 'send'` → uændret (`'send'`)
- (pakker uændret — `default_package_action` er låst til `'send'`)

**2. Backfill (engangs-update)**

Find mail items oprettet i dag/seneste 24t hvor:

- `mail_type = 'brev'`
- `chosen_action = 'scan'`
- tenant's `default_mail_action = 'scan'`
- mail item er endnu ikke synkroniseret/faktureret (eller hvor lejeren ikke aktivt har valgt scan)

…og ret dem til `chosen_action = 'standard_scan'`. Konkret omfatter det forsendelse 3140. Jeg viser listen før opdatering så du kan godkende.

**3. (Valgfrit) UI-tekst i `DefaultActionSetup**`

Tilføj en lille hjælpetekst under "Scanning"-valget: *"Breve scannes på næste planlagte gratis scandag. Vælg manuelt 'Scan nu' på det enkelte brev hvis du ønsker det scannet med det samme (mod gebyr)."* — så lejerne forstår forskellen. ja til dette, for Lite og Standard lejere. Plus lejere kan får deres breve scannet med det samme uden gebyr.

## Tekniske detaljer

- `apply_tenant_default_action` er en `BEFORE INSERT`-trigger på `mail_items`. Den eksisterende kode er allerede vist i db-functions; kun selve mappingen ændres.
- `sync-officernd-charge` håndterer allerede `standard_scan` korrekt (linje 55: returnerer 0 kr.) — ingen ændring nødvendig.
- `getPlanName` (linje 117) bruger `defaultAction` som fallback når `chosen_action` er null — irrelevant her, da vi sætter `chosen_action` eksplicit.
- `OperatorDashboard.tsx` og `TenantDashboard.tsx` viser allerede "Standard scanning {dato}" korrekt for `standard_scan`.

## Spørgsmål inden jeg går i gang

Skal jeg også tilføje hjælpeteksten i `DefaultActionSetup` (punkt 3), eller kun ændre selve logikken (punkt 1+2)?