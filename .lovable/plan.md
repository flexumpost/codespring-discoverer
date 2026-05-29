# Fix: "Fejl" ved opdatering af Ubetalt faktura

## Årsag

Postgres-loggene viser:
```
ERROR: infinite recursion detected in policy for relation "tenants"
```

Policy'en `"Tenants update own tenant"` på `public.tenants` har denne WITH CHECK:
```sql
((user_id = auth.uid()) AND (tenant_type_id = (
  SELECT tenants_1.tenant_type_id
  FROM tenants tenants_1
  WHERE (tenants_1.id = tenants_1.id)   -- altid sand → rammer alle rækker
)))
```

To problemer:
1. Subquery'en laver `SELECT ... FROM tenants` inde i en policy på `tenants` → uendelig rekursion (RLS udløses igen på subquery'en).
2. `WHERE tenants_1.id = tenants_1.id` matcher alle rækker i stedet for den aktuelle række.

Selv når en operatør laver `UPDATE tenants SET has_unpaid_invoice = false WHERE id = '...'`, evalueres WITH CHECK fra denne policy som en del af det samlede policy-udtryk og fejler — derfor `error` retur fra `supabase.update(...)` og "Fejl"-toast i `TenantsPage.tsx`.

## Plan

### 1. Migration: erstat policy + tilføj SECURITY DEFINER guard for tenant_type_id

- Drop policy `"Tenants update own tenant"`.
- Tilføj ny policy med samme USING (`user_id = auth.uid()`) og en simpel WITH CHECK uden self-reference:
  - `WITH CHECK (user_id = auth.uid())`
- Bevar reglen om at en lejer ikke selv kan ændre `tenant_type_id` via en BEFORE UPDATE trigger:
  ```sql
  CREATE FUNCTION public.prevent_tenant_self_type_change() RETURNS trigger ...
  -- Hvis auth.uid() = NEW.user_id (dvs. lejer-opdatering, ikke operator)
  -- og NEW.tenant_type_id IS DISTINCT FROM OLD.tenant_type_id → RAISE EXCEPTION
  ```
  Operatører rammer ikke triggeren da deres opdateringer typisk har `auth.uid()` ≠ tenant.user_id, men for at være sikker tjekker vi også `public.is_operator()` og skipper.

### 2. Verifikation

- Som operatør: toggle "Ubetalt faktura" af/på på MetaCad → ingen fejl, værdi gemmes.
- Som lejer: kan stadig opdatere egne felter (fx shipping-adresse), men forsøg på at ændre `tenant_type_id` afvises.

## Out of scope

- Ingen ændring i `TenantsPage.tsx` (frontend-logikken er korrekt; den fejler kun pga. RLS-rekursionen).
- Ingen ændring i email-flow eller pickup_date-genberegning.
