# Ubetalt faktura: virksomheder der betales af en anden

## Problem
Den natlige kontrol springer virksomheder over, der betales af en anden (fx ARVON HOLDING APS). Gamle fakturaer, der står direkte på dem, bliver aldrig opdateret eller slettet. Så kan "Ubetalt faktura" blive hængende, selv når alt er betalt.

## Ændring
- I den natlige kontrol: virksomheder, der betales af en anden, får deres egne gemte fakturaer ryddet, hvis OfficeRnD ikke længere har dem som ubetalte. Derefter følger de stadig betalerens markering.
- Hvis betaleren ikke findes som lejer hos os, slås fakturaerne op i OfficeRnD på "betales af"-e-mailen, ligesom før.

## Technical details
- sync-officernd-invoices/index.ts: in the billed-tenant branch, run the member lookup + listInvoices on `billed_by_email` (when set) and delete stale `officernd_invoices` rows for that tenant_id not returned, before `recomputeTenantFlag(..., 1)`.
- No change to recomputeTenantFlag.
