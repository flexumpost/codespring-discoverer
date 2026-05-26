# Betales af-funktion (OfficeRnD fakturering på andens konto)

Tilføj mulighed for at en lejers gebyrer i OfficeRnD overføres til en anden virksomheds konto (f.eks. Unimont betales af Radner). Kun operatører kan konfigurere dette.

## 1. Database
Migration der tilføjer felter på `tenants`:
- `billed_by_email` (text, nullable)
- `billed_by_company` (text, nullable)

Ingen ændring af RLS — eksisterende "Operators update tenants" dækker redigering. Vi tilføjer ikke disse felter til "Tenants update own tenant"-policy, så lejeren selv kan ikke ændre dem.

## 2. UI på lejerens indstillingsside (`src/pages/TenantDetailPage.tsx`)
Ny boks "Betales af" placeret under kontakt-sektionen:
- 2 felter: E-mail og Firmanavn
- Hjælpetekst: "Hvis udfyldt, sendes alle OfficeRnD-gebyrer for denne lejer til den angivne e-mail/virksomhed i stedet for lejerens egen konto."
- Knap: "Gem"
- Vises **kun for operatører** (`isOperator`-check, samme mønster som andre operator-only felter på siden)
- Felterne tilføjes til `tenant`-typen, state og update-mutation
- Tom e-mail = ingen override (gebyrer sendes som hidtil)

Ingen ny side; vi udvider eksisterende detail-page.

## 3. Edge function `sync-officernd-charge`
Læs `billed_by_email` og `billed_by_company` fra tenant.

**Når `billed_by_email` er sat:**
- Brug *kun* `billed_by_email` til OfficeRnD-medlemslookup (override af nuværende candidate-liste). Hvis ikke fundet → fejl som hidtil.
- Tilføj lejerens firmanavn i `name`-feltet på charges, så betaleren kan se hvem gebyret tilhører.

**Når `billed_by_email` er tom:** uændret adfærd (contact_email + tenant_users-fallback).

### Navnegenerering
Nuværende format:
- Med plan: `${planName} (${stamp}) - ${date}`
- Uden plan: `Postgebyr: ${amountText} (${mailType}) (${stamp}) - ${date}`
- Porto: `${portoPlan} (${stamp}) - ${date}`

Når override er aktiv, præfix med lejerens firmanavn:
- `${planName} (${tenantCompanyName}) - ${stamp} - ${date}`
- Porto: `${portoPlan} (${tenantCompanyName}) - ${stamp} - ${date}`

Eksempel fra brugerens prompt: `Forsendelse (Unimont) - 3285 - 26-05-26`

Tenant-firmanavnet hentes via det eksisterende `mail_items → tenants`-select (tilføj `company_name` og de to nye felter).

## 4. Edge function `sync-officernd-charge-batch`
Samme override-logik (medlemslookup via `billed_by_email`, præfix firmanavn i charge `name`). Læser tenant fields i samme query.

## Teknisk
- Migration tilføjes via supabase migration tool.
- `src/integrations/supabase/types.ts` regenereres automatisk efter migration.
- Begge edge functions deployes efter ændringerne.
- Ingen ændring af fee-beregning eller plan-lookup — kun *hvem* der debiteres og *hvad* der står i charge-navnet.

## Ikke inkluderet (kan tilføjes senere hvis ønsket)
- Retry-knap på fejlede `officernd_sync_log`-rækker (nævnt i tidligere besked).
- Validering af at `billed_by_email` faktisk findes i OfficeRnD ved gem-tidspunkt.