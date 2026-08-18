# Faktura 17378 blev betalt, men markeringen blev ikke fjernet

## Hvad der faktisk skete

Webhooken fra OfficeRnD kom frem, og fakturaen blev gemt i systemet (status `paid`, betalt 17. aug. kl. 22:47 UTC / 00:47 dansk tid). Men fakturaen kunne ikke kobles til en lejer:

- I OfficeRnD er faktura 17378 udstedt til et **team** (`team: 653fc1ed...`), ikke til et enkelt medlem — feltet `member` er tomt.
- Systemet finder i dag kun lejeren ud fra medlemmets e-mail. Uden medlem findes ingen e-mail, og fakturaen blev gemt med `tenant_id = NULL`.
- Uden lejer bliver flaget "Ubetalt faktura" aldrig genberegnet — hverken ved oprettelse eller ved betaling. Derfor står Compendo ApS stadig markeret.

Det samme gælder alle team-fakturaer: der ligger pt. 2 gemte fakturaer, og begge er uden lejer-kobling. Hændelsesloggen er tom, hvilket bekræfter at ingen genberegning nogensinde har kørt.

## Hvad der skal bygges

1. **Team-opslag ved faktura-events**
   Når en faktura ikke har et medlem, slås teamet op i OfficeRnD og lejeren findes via:
   - teamets e-mail / faktureringsmail (matcher også `billed_by_email`, så fakturaer betalt af et andet firma routes korrekt),
   - ellers teamets primære medlem/kontaktperson,
   - ellers teamets navn mod lejerens firmanavn.

2. **Gem team-id på fakturaen**
   Så en faktura, der én gang er koblet til en lejer, bliver ved med at være det ved senere status-opdateringer.

3. **Genberegning ved hver faktura-hændelse**
   Efter at koblingen er fundet, køres genberegningen af "Ubetalt faktura" som i dag — nu også for team-fakturaer.

4. **Efterbehandling af eksisterende data**
   Den natlige afstemning og knappen "Afstem nu" forsøger igen at koble alle gemte fakturaer uden lejer, og retter flaget bagefter. Det rydder Compendo ApS op, så snart afstemningen køres manuelt.

5. **Synlighed for operatøren**
   Under Indstillinger → OfficeRnD vises antal fakturaer, der ikke kunne kobles til en lejer, så et lignende hul opdages med det samme.

## Teknisk

- `supabase/functions/_shared/officernd.ts`: ny `getTeamById()` (v1/v2 fallback som ved fakturaer) og `invoiceTeamId()`.
- `supabase/functions/_shared/invoice-flag.ts`: ny `resolveTenantIdsForInvoice()` der prøver medlem → team-e-mail → team-navn mod `tenants.company_name`; `upsertInvoice` gemmer team-id.
- `supabase/functions/officernd-webhook/index.ts`: bruger den nye resolver i `handleInvoiceEvent`.
- `supabase/functions/sync-officernd-invoices/index.ts`: re-resolver rækker med `tenant_id IS NULL` og genberegner flag for berørte lejere.
- Migration: kolonne `team_id text` på `officernd_invoices` (samme grants/RLS som i dag).
- `src/components/OfficeRnDSettingsTab.tsx`: tæller for ikke-koblede fakturaer i `InvoiceFlagCard`.

Bemærk: team-opslaget kræver at API-appen har læseadgang til teams (`flex.community.teams.read`). Hvis scopet mangler, falder systemet tilbage til navnematch på firmanavn.
