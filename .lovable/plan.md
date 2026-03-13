

## Plan: Skrivebeskyttede kontaktoplysninger + "Opret ny postmodtager"

### Overblik
Kontaktoplysninger på brugersiden bliver read-only. En ny knap "Opret ny postmodtager" gør det muligt at oprette yderligere brugere med adgang til den specifikke konto via en ny `tenant_users`-tabel.

### 1. Database: Ny `tenant_users`-tabel
```sql
CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
```
RLS: Lejere kan se deres egne rækker, operatører kan se alt.

### 2. Database: Opdater `my_tenant_ids()` funktion
Udvid funktionen til også at returnere tenant IDs fra `tenant_users`:
```sql
CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS SETOF UUID ...
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
$$;
```
Dette sikrer at alle eksisterende RLS-policies (mail_items, storage osv.) automatisk virker for nye postmodtagere.

### 3. Edge function: `create-tenant-user`
Ny edge function der:
- Verificerer at kalderen er ejer af den pågældende tenant (via `my_tenant_ids()`)
- Opretter ny auth-bruger med admin API (email + autogenereret password)
- Tildeler `tenant` rolle i `user_roles`
- Indsætter i `tenant_users` med det relevante `tenant_id`
- Returnerer success (velkomst-email implementeres senere)

### 4. `src/pages/SettingsPage.tsx`
- Gør kontaktfelterne (kontaktperson og kontakt-email) **read-only** med `disabled` eller ren tekst-visning
- Fjern "Gem"-knappen og `updateMutation`
- Tilføj "Opret ny postmodtager"-knap under Kontaktoplysninger-kortet
- Knappen åbner en Dialog med felter: Navn, Email, Adgangskode
- Ved oprettelse kalder edge function `create-tenant-user`

### 5. `src/hooks/useTenants.tsx`
Udvid query til også at hente tenants via `tenant_users`:
```typescript
// Hent tenants hvor user_id matcher ELLER via tenant_users
const { data: directTenants } = await supabase
  .from("tenants").select("*, tenant_types(...)").eq("user_id", user.id);
const { data: linkedTenants } = await supabase
  .from("tenant_users").select("tenant_id, tenants(*, tenant_types(...))")
  .eq("user_id", user.id);
// Merge og dedupliker
```

### Resultat
- Kontaktoplysninger er skrivebeskyttede for lejere
- Lejere kan oprette nye postmodtagere med adgang til deres konto
- Alle eksisterende RLS-policies virker automatisk via opdateret `my_tenant_ids()`

