

## Plan: Fix uendelig rekursion i RLS-policies

### Problem
Fejlen `infinite recursion detected in policy for relation "tenants"` skyldes cirkulær afhængighed mellem RLS-policies:

1. `tenants` SELECT-policy refererer til `tenant_users` tabellen
2. `tenant_users` SELECT-policy refererer til `tenants` tabellen
3. Postgres evaluerer begge policies og ender i uendelig rekursion

### Fix: En enkelt database-migration

Erstat `tenant_users` SELECT-policyen med en der bruger en `SECURITY DEFINER`-funktion i stedet for at query `tenants` direkte. Dette bryder den cirkulære afhængighed.

```sql
-- Create a SECURITY DEFINER function to get owned tenant IDs without triggering tenants RLS
CREATE OR REPLACE FUNCTION public.owned_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = _user_id
$$;

-- Replace the recursive tenant_users policy
DROP POLICY "Users read own tenant_users" ON public.tenant_users;
CREATE POLICY "Users read own tenant_users" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_operator()
    OR tenant_id IN (SELECT owned_tenant_ids(auth.uid()))
  );
```

`SECURITY DEFINER` bypasser RLS og forhindrer dermed rekursionen. Ingen kodeændringer er nødvendige -- kun denne ene migration.

