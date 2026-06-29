## Mål
Når en lejer booker afhentning, må det tidligste valgbare tidsrum ligge mindst 2 timer fremme i tiden. Eksempel: kl. 10:17 → tidligste slot starter kl. 13:00 (slottet 12:00–13:00 udelukkes, da det starter før 12:17).

## Ændring

### `src/pages/TenantDashboard.tsx` — `getPickupHours(date)`
- Tilføj logik der beregner tærskel = `nu + 2 timer`.
- Hvis den valgte `date` er **i dag**, filtreres tidsrum, så kun slots hvis starttime `>=` ceil(tærskel-time, oprundet hvis der er minutter) vises.
  - Konkret: `minHour = thresholdMinutes > 0 ? thresholdHour + 1 : thresholdHour`.
- Hvis den valgte dato er en fremtidig dag, vises alle slots fra 09:00 som i dag (ingen ændring).
- Bibehold den eksisterende max-time-logik (fredag 14, ellers 16).
- Hvis ingen slots er tilbage for i dag (f.eks. efter kl. 14:01 mandag–torsdag, hvor min = 17 > 16), returneres tom liste — `Select` viser så ingen valgmuligheder, og `Bestil afhentning`-knappen forbliver disabled (allerede styret af `!pickupHour`).

### Kalender (samme dialog)
- Ingen ændring i `disabled`-funktionen på kalenderen. I dag forbliver valgbar — brugeren kan stadig vælge i dag, men får kun de slots der ligger ≥ 2 timer ude.

## Ikke-mål
- Ingen ændring af weekend/lukkedags-logik.
- Ingen ændring af serverside validering eller `choosePickup`-mutationen.
- Ingen ændring af tekster/oversættelser.
