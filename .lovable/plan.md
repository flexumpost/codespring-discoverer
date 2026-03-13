

## Plan: "Opret ny lejer"-knap på Lejere-siden

### Ændringer i `src/pages/TenantsPage.tsx`

**1. Tilføj "Opret ny lejer"-knap ved siden af overskriften**
- Placer knappen til højre for "Lejere"-overskriften med et `Plus`-ikon.

**2. Tilføj dialog med formular**
- Felter: Virksomhedsnavn (company_name), Kontakt email (contact_email), Lejertype (tenant_type_id via Select dropdown).
- Hent lejertyper fra `tenant_types`-tabellen til dropdown (rækkefølge: Fastlejer, Lite, Standard, Plus, Retur til afsender, Nabo).
- Ved oprettelse: indsæt i `tenants`-tabellen, invalider queries, luk dialog, vis toast.
- Velkomst-email springes over nu (implementeres senere som aftalt).

**3. Imports**
- Tilføj: `useState`, `useMutation`, `useQueryClient`, `Dialog`, `Button`, `Input`, `Label`, `Select`, `Plus`-ikon, `toast`.

### Ingen databaseændringer
Tabellen `tenants` har allerede de nødvendige kolonner (`company_name`, `contact_email`, `tenant_type_id`). RLS tillader operatører at indsætte.

