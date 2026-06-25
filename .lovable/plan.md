## Problem

Den nye UPDATE-policy på `public.tenants` indeholder en `WITH CHECK` med en subquery på `public.tenants` selv:

```
WITH CHECK (
  user_id = auth.uid()
  AND NOT (tenant_type_id IS DISTINCT FROM (
    SELECT t.tenant_type_id FROM tenants t WHERE t.id = tenants.id
  ))
)
```

Når lejeren opdaterer sin række (fx forsendelsesadresse), evaluerer Postgres `WITH CHECK`, som læser `tenants` igen → trigger samme policy → **infinite recursion**.

## Løsning

Privilege-escalation er allerede beskyttet af triggeren `prevent_tenant_self_type_change` (kører ved UPDATE, bruger `is_operator()` + `SECURITY DEFINER`, kaster exception hvis non-operator ændrer `tenant_type_id`). `WITH CHECK`-klausulen er derfor overflødig.

**Migration:** Drop og genskab `Tenants update own tenant` med en simpel check:

```sql
DROP POLICY "Tenants update own tenant" ON public.tenants;

CREATE POLICY "Tenants update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

Triggeren håndterer fortsat tenant_type_id-låsen, så security-findingen `tenants_update_tenant_type_escalation` forbliver lukket.

## Efter migration

Test at lejeren kan gemme forsendelsesadresse uden recursion-fejl.