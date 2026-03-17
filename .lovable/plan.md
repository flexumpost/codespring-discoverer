

## Beskyt kontaktpersonen (ejer) mod sletning

### Problem
Kontaktpersonen (tenant owner via `tenants.user_id`) optræder i `tenant_users`-tabellen og vises som en almindelig postmodtager med slet-knap. Det skal ikke være muligt at slette kontaktpersonen.

### Ændringer

**1. `src/pages/SettingsPage.tsx` — Filtrer ejer fra postmodtager-listen**
- I postmodtager-listen (linje ~287), skjul slet-knappen for den bruger hvis `user_id === selectedTenant.user_id`
- Alternativt: filtrer brugeren helt fra listen og vis dem separat under "Kontaktoplysninger" (allerede vist der)

**2. `src/pages/TenantDetailPage.tsx` — Samme beskyttelse i operatør-visningen**
- I postmodtager-sektionen (linje ~386), marker ejeren tydeligt (f.eks. badge "Kontaktperson") og vis ingen slet-mulighed

**3. `supabase/functions/delete-tenant-user/index.ts` — Server-side beskyttelse**
- Tilføj et check: hvis den bruger der forsøges slettet har `user_id === tenant.user_id`, afvis med fejlbesked "Kontaktpersonen kan ikke slettes"
- Dette sikrer mod API-kald udenom UI

### Konkret implementation

**SettingsPage** — i postmodtager-listen:
- Sammenlign `tu.user_id` med `selectedTenant?.user_id`
- Hvis match: vis brugeren med badge "Kontaktperson" i stedet for slet-knap
- Eller filtrer dem helt ud (de vises allerede under Kontaktoplysninger)

**TenantDetailPage** — i operatørens postmodtager-liste:
- Sammenlign `tu.user_id` med `tenant?.user_id`
- Vis badge "Kontaktperson" ved match, ingen slet-ikon

**delete-tenant-user edge function** — server-side guard:
- Slå `tenant_users`-rækken op, find `tenant_id`
- Tjek om `tenant.user_id === tenant_users.user_id`
- Returner 403 hvis det er tilfældet

Ingen database-migrering nødvendig.

