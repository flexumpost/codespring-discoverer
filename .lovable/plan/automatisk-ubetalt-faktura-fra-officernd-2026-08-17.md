# Automatisk "Ubetalt faktura" fra OfficeRnD

Ja, det er muligt. I dag sættes "Ubetalt faktura" kun manuelt med et flueben på lejerlisten. Vi kobler feltet til fakturastatus i OfficeRnD, så det sættes og fjernes automatisk.

## Sådan virker det

1. OfficeRnD sender en webhook, hver gang en faktura oprettes eller ændrer status.
2. Systemet finder den lejer, fakturaen hører til (via medlemmets e-mail — samme opslag som gebyroverførslen bruger, inkl. lejere der betales af et andet firma).
3. Har lejeren mindst én faktura med status `failed` eller `overdue`, sættes markeringen "Ubetalt faktura".
4. Bliver fakturaen betalt (`paid`) eller annulleret/krediteret, fjernes markeringen — dog kun hvis lejeren ikke har andre ubetalte fakturaer.
5. En daglig kontrol henter fakturastatus fra OfficeRnD og retter eventuelle afvigelser (fx hvis en webhook går tabt).

Operatøren kan fortsat sætte/fjerne fluebenet manuelt; den næste automatiske opdatering vil dog rette det til det, OfficeRnD siger.

## Sporbarhed

Alle statusskift logges (lejer, faktura-id, gammel/ny status, tidspunkt) og vises i en log, så det kan efterprøves hvorfor en lejer blev markeret.

## Teknisk

- Ny tabel `officernd_invoices` (tenant_id, invoice_id, member_id, status, amount, due_date, opdateret) som kilde til beregningen af flaget. Med RLS: kun operatører kan læse; edge functions skriver via service role.
- Udvid `supabase/functions/officernd-webhook/index.ts` til også at håndtere invoice-events (`invoice.created`, `invoice.updated`, `invoice.paid`, `invoice.failed`). Nuværende fee-matchning bevares uændret.
- Delt hjælper i `supabase/functions/_shared/officernd.ts`: `listInvoices()` / `getInvoice()` mod v2 `/invoices`, plus `resolveTenantForMember()` som genbruger `findMembersByEmail`-logikken (inkl. `billed_by_email`).
- Ny funktion `sync-officernd-invoices` (pg_cron dagligt, med bounded batch og pause ved 402/403) der afstemmer alle lejeres fakturastatus og opdaterer `tenants.has_unpaid_invoice`.
- OAuth-scope: kræver `flex.billing.invoices.read` på OfficeRnD-appen — den skal tilføjes i OfficeRnD, ellers fejler afstemningen.
- Webhook i OfficeRnD skal konfigureres til invoice-events mod den eksisterende webhook-URL med samme hemmelighed.

## Afhængighed

Jeg kan ikke tilføje OAuth-scopet eller webhook-abonnementet i OfficeRnD for dig — det skal gøres i OfficeRnD-portalen, når koden er på plads.
