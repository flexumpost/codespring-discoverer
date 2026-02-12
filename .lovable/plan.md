
# Lejertype info-boks efter lejer-feltet

## Hvad det goer for brugeren
Efter lejer-feltet vises en info-boks der angiver lejerens type (f.eks. "Standard", "Plus", "Fastlejer"). Hver lejertype faar sin egen baggrundsfarve saa operatoeren hurtigt kan se hvilken type lejer der er valgt. Inden en lejer er valgt, vises en tom hvid boks.

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Udvid tenants-queryen** (linje 55-58)
   - Aendr `.select("id, company_name")` til `.select("id, company_name, tenant_type_id")` saa vi har adgang til lejertypen

2. **Definér farvekort for lejertyper**
   - Et objekt der mapper lejertype-navn til Tailwind-baggrundsfarver:
     - Lite: `bg-blue-100 text-blue-800`
     - Standard: `bg-green-100 text-green-800`
     - Plus: `bg-purple-100 text-purple-800`
     - Fastlejer: `bg-amber-100 text-amber-800`
     - Nabo: `bg-cyan-100 text-cyan-800`
     - Retur til afsender: `bg-red-100 text-red-800`

3. **Hent tenant_types data** (allerede hentet via `tenantTypes`-queryen paa linje 66-74)
   - Brug den eksisterende query til at slaaa op hvilken type den valgte lejer har

4. **Tilfoej info-boks i `formFields`** (efter lejer-sektionen, linje 398)
   - Naar `selectedTenantId` er sat: find lejerens `tenant_type_id` fra `tenants`-arrayet, slaaa op i `tenantTypes` for at faa navnet, og vis det i en farvet boks
   - Naar ingen lejer er valgt: vis en tom hvid boks med tynd border og teksten "Ingen lejer valgt" i lysegraat

### Ingen database-aendringer
Alt data er allerede tilgaengeligt - vi tilfoeger blot `tenant_type_id` til den eksisterende select-query.
