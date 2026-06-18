# Plan: Forhindre manglende porto-overførsel fremover

Formålet er at sikre at en forsendelse aldrig kan ende i en tilstand hvor `chosen_action = under_forsendelse` men `porto_option` mangler — uden at det opdages.

## 1. UI-validering i ShippingPrepPage

I `src/pages/ShippingPrepPage.tsx` (og evt. relaterede komponenter hvor porto vælges):

- Når operatøren forsøger at låse/afslutte en forsendelse med `chosen_action = under_forsendelse`:
  - Kræv at `porto_option` er udfyldt (ikke `NULL` og ikke `'none'`).
  - Hvis tomt: vis fejl ("Vælg porto før forsendelsen kan låses") og bloker lås-knappen.
- Visuel markering (rød ramme / advarselsikon) på rækker hvor porto mangler, så det fanges før låsning.

## 2. Edge function — defensiv sikring

I `supabase/functions/sync-officernd-charge-batch/index.ts`:

- Når en mail-item har `chosen_action = under_forsendelse` og `porto_option` er `NULL`/`'none'`:
  - Skip charge (i stedet for at sende 0 kr.).
  - Log til `officernd_sync_log` med ny status `skipped_missing_porto` + mail_item_id.
  - Opret en `notifications`-række til operatør om at en forsendelse mangler porto og ikke blev faktureret.

## 3. Operatør-notifikation

- Tilføj notifikationstype så manglende-porto-sager dukker op i operatør-dashboardet (samme mekanisme som øvrige notes/notifikationer).
- Inkluder mail_item_id og lejer-navn så det er klikbart/sporbart.

## 4. Verifikation

- Manuelt test-flow: opret en forsendelse uden porto → bekræft at UI blokerer låsning.
- Simuler edge-function-kald på en mail_item uden porto → bekræft `skipped_missing_porto` log + notifikation.
- Tjek at eksisterende Plus-tier-breve (0 kr.) stadig logges som `skipped_zero_fee` og ikke som manglende porto.

## Tekniske detaljer

- Berørte filer:
  - `src/pages/ShippingPrepPage.tsx` (UI-validering + lås-knap)
  - `supabase/functions/sync-officernd-charge-batch/index.ts` (skip + log + notify)
- Ingen DB-skemaændringer nødvendige — `officernd_sync_log.status` og `notifications` understøtter allerede frie tekstværdier.
- Plus-tier-undtagelse (`if (!isPackagePorto && tier === "Plus") continue;`) bevares uændret.
