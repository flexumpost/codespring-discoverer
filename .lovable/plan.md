## Mål
Genoverfør kun de fees, der fejlede **i dag** (præ-godkendelse af v2-token). Ældre fejl er manuelt indtastet og skal ikke røres.

## Udgangspunkt
`officernd_sync_log` har 44 unikke `mail_item_id` med seneste status `failed` fra i dag (alle med `AccessDeniedError` mod v1). Disse skal nu køres igennem den nye v2-flow.

## Plan

### 1. One-off resync via exec-script (efter switch til build mode)
- SQL: vælg distinct `mail_item_id` hvor seneste log-række er `failed` AND `created_at >= current_date` AND der ikke findes en senere `success/confirmed`-række.
- For hver: kald deployed `sync-officernd-charge` edge function med service-role nøgle, sekventielt med ~400 ms delay.
- Saml resultat i CSV til `/mnt/documents/officernd-resync-result.csv` med kolonner: `tenant`, `contact_email`, `mail_item_id`, `stamp_number`, `mail_type`, `new_status`, `charge_id`, `error_message`.
- Vis resultatet til operatøren som artifact + kort opsummering (succeded/failed counts).

### 2. Ingen UI-ændringer
Fordi det er en engangsoperation knyttet til migrationen. Hvis lignende fejl opstår senere, kan vi tilføje en knap. UI-arbejde springes over nu.

## Tekniske noter
- Genbruger eksisterende `sync-officernd-charge` (ingen ny edge function).
- `sync-officernd-charge` skriver nye log-rækker pr. forsøg – historik bevares.
- Idempotens: hvis et item nu er manuelt håndteret i OfficeRnD, vil v2 enten finde eksisterende fee eller oprette en ny – vi tager kun items hvor *seneste* log er `failed` (ingen efterfølgende success), så manuelt-løste items rammes ikke automatisk.

## Out of scope
- Ældre fejl (`created_at < current_date`) – ignoreres.
- Webhook-migration.
- Ingen UI-knap eller ny edge function.
