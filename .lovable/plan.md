

## Plan: Fix RLS-rekursion på tenant_users DELETE-policy

### Problem
Den nyligt oprettede DELETE-policy på `tenant_users` bruger en direkte subquery mod `tenants`-tabellen, hvilket udløser uendelig rekursion i RLS.

### Fix
Erstat policyen med en der bruger den eksisterende `owned_tenant_ids()` security definer funktion (som allerede bruges i andre policies for at undgå netop dette problem).

### Database migration
```sql
DROP POLICY "Tenant owners delete tenant_users" ON public.tenant_users;

CREATE POLICY "Tenant owners delete tenant_users" ON public.tenant_users
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT owned_tenant_ids(auth.uid())));
```

### Filer der ændres
1. Ny database migration (kun SQL, ingen kodeændringer)

