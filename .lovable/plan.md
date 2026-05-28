## Årsag

Forsendelsen til **M.O.D** (mail_item `1e65af06…`) fejlede i `sync-officernd-charge-batch` med:

```
OfficeRnD checkout failed [400]:
  "fees.0.property name should not exist"
  "fees.0.property description should not exist"
```

I sidste runde tilføjede vi `name` og `description` direkte på fee-linjen i `POST /checkout` for at få datoen og forsendelsesnummeret med ind på fakturalinjen. Det blev valideret lokalt, men OfficeRnD v2's `FeeRequestDto` accepterer **kun** `{ plan, date, location }` på fee-linjer og afviser hele kaldet hvis der er ekstra felter. Derfor blev hverken hoved-gebyr eller porto overført for M.O.D — og det rammer alle andre overførsler oprettet i samme batch/flow efter ændringen.

## Plan

### 1. `supabase/functions/_shared/officernd.ts`
- Fjern `name` og `description` fra `feeLine` igen, så `POST /checkout` kun sender `{ plan, date }` (det v2 faktisk accepterer).
- Behold `name`/`description` på `CreateFeeInput` (de bruges til loggen + til opfølgnings-PATCH).
- Efter `POST /checkout` returnerer et fee-id: hvis `input.description` (eller `input.name`) er sat, lav et opfølgnings-kald:
  - `PATCH {apiBase}/fees/{id}` med body `{ description: input.description ?? input.name }`.
  - Wrap i try/catch — fejler PATCH'en logges det som warning, men hovedflowet skal stadig returnere success (gebyret er allerede oprettet i OfficeRnD).
- Hvis det viser sig at v2 også afviser `PATCH /fees/{id}` på description (kendt fra v1→v2 ændringer), prøv subsidært `PATCH {apiBase}/charges/{id}` eller læg info i `metadata` — vælges først hvis første PATCH også giver 400/404; ingen ekstra scopes nødvendige ud over hvad appen allerede har til charges.

### 2. Sync-funktionerne
- `sync-officernd-charge/index.ts` og `sync-officernd-charge-batch/index.ts` ændres ikke i deres label-bygning — de fortsætter med at sende det fulde format (`"${planName} - ${dateLabel} (${stamp_number})"`) som `name`/`description` til `createFee`. Det er nu `_shared/officernd.ts` der står for, hvordan den info kommer ind i OfficeRnD.

### 3. Genoverfør M.O.D-fejlen
- Efter deploy: kør samme resync som sidst, men kun for `mail_item_id = 1e65af06-af95-4f27-bd9a-10d7c5ece0d6`, så M.O.D's gebyr (30 kr. + porto) lander i OfficeRnD med korrekt beskrivelse.
- Bekræft i `officernd_sync_log` at status er `success` og at linjen i OfficeRnD viser dato + forsendelsesnummer.

### 4. Verificér
- Lav en ny testforsendelse (eller bed bruger om at sende én), åbn fakturaen i OfficeRnD og kontroller at fee-linjen viser fx `Pakke forsendelse (Standard) - 28-05-26 (12345)` via PATCH-beskrivelsen.
- Hvis OfficeRnD UI viser plan-navnet uden beskrivelsen prominent, accepter det som best effort — info findes på fee'en og i `officernd_sync_log`.

## Ud af scope
- Ingen prisændringer, ingen ny plan-matching, ingen UI-ændringer.
- Ingen retroaktiv genoverførsel af andre tidligere gebyrer ud over de der konkret fejlede i denne batch (kun M.O.D pt.).
