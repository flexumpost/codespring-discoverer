## Mål

Når flere breve/pakker afhentes af samme lejer samme dag, skal OfficeRnD kun tillægges **ét** afhentningsgebyr (fx 30 kr. for Standard) i stedet for ét pr. brev.

## Ændring

Kun `supabase/functions/sync-officernd-charge/index.ts` (den funktion trigger-en `notify_officernd_on_archive` kalder pr. arkiveret afhentning).

Lige inden hovedgebyret oprettes i OfficeRnD, indsæt en check:

1. Beregn den effektive handling; hvis det er `"afhentning"` (dvs. `chosen_action` var `"afhentet"` eller `"afhentning"`), slå op i `officernd_sync_log`:
   - Find rækker hvor `charge_id` matcher et afhentnings-gebyr for **samme lejer**, **samme dato** (dansk kalenderdag), og status er `"confirmed"` eller `"pending_confirmation"`.
   - Join via `mail_items.tenant_id`.
   - Filtrer på `plan_name = "Brev/pakke afhentning (<tier>)"` (feltet findes allerede i log-tabellen).
2. Hvis en sådan række findes: spring hovedgebyret over — indsæt i stedet en log-linje med `status = "skipped_grouped_pickup"`, `charge_id = "skipped_grouped_pickup"`, `amount_text = "0 kr. (samlet afhentning)"`. Porto-delen springes ikke over (afhentning har ingen porto alligevel).
3. Ellers: fortsæt uændret og opret gebyret som i dag.

Ingen ændring i:
- `sync-officernd-charge-batch` (bruges kun til forsendelse; ingen afhentning her).
- Scanning-fakturering (forbliver pr. brev jf. bekræftelse).
- DB-trigger, RLS, priser, UI, pris-tekster.

## Tekniske detaljer

- "Samme dag" bestemmes af `created_at::date` på log-rækkerne i tidszonen `Europe/Copenhagen` (`(created_at AT TIME ZONE 'Europe/Copenhagen')::date`).
- Query udføres via supabase-js: hent kandidat-logs for i dag med `plan_name ILIKE 'Brev/pakke afhentning%'` og `status IN ('confirmed','pending_confirmation')`, joinet med `mail_items!inner(tenant_id)` filtreret på lejerens `tenant_id`.
- Idempotens: hvis samme mail_item allerede har en `confirmed`/`pending_confirmation`-linje, springes den allerede over øverst i funktionen — den eksisterende guard bevares.
- Log-status `"skipped_grouped_pickup"` er nyt, men `status` er en fri `text`-kolonne, så ingen migration nødvendig.
- Efter kodeændring: deploy edge-funktionen og test med `curl_edge_functions` på en tenant med to nyligt afhentede breve i test-miljøet hvis muligt; ellers bekræft ved næste rigtige afhentning at kun én charge oprettes i OfficeRnD.
