# Automatisering for lejere — ret det valg der fejler

## Findings (verificeret i koden)

Lejere kan allerede vælge automatisering: menuen "Automatisering" (`/automation`) åbner `AutomationPage` med `AutomationCard`, hvor standardhandlingen for breve vælges (Forsendelse / Scanning / Afhentning). Databasen tillader opdateringen (RLS: "Tenants update own tenant"), og pakker er låst til Forsendelse.

**Men der er en fejl:** kortet viser "Afhentning" som mulighed, men en databasetrigger (`validate_tenant_default_actions`) afviser 'afhentning' som standardhandling — lejeren får derfor en rå fejl ("Afhentning kan ikke vælges som standardhandling...") når vedkommende trykker Gem. Samme kort bruges i operatørens lejer-side under fanen "Priser & handling", så fejlen findes begge steder.

## Ændringer

1. **`src/components/AutomationCard.tsx`**
   - Fjern "Afhentning" fra `OPTIONS` (den må ikke være standardhandling pr. jeres regel).
   - Tilføj en kort hjælpetekst under valgene: "Afhentning kan altid vælges pr. enkelt brev/pakke i dashboardet, hvor du selv booker tidspunkt."
   - Gem-knappen og øvrige logik uændret.

2. **i18n (`src/i18n/locales/da.json` + `en.json`)**
   - Ny nøgle `automation.pickupNote` med teksten ovenfor (dansk + engelsk).

## Ikke berørt

- Lejerens menu, `/automation`-ruten, OperatorDashboard og gebyrlogik — ingen ændringer.
- Pakkers låste standardhandling (Forsendelse) forbliver som tekst i kortet.

## Verifikation

- Byg fejlfri.
- Playwright som lejer (mintet session): åbn `/automation`, bekræft kun Forsendelse og Scanning kan vælges, gem virker, og hjælpeteksten vises.
