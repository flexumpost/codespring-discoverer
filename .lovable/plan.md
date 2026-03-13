
Problemforståelse
- Fejlen er stadig: `infinite recursion detected in policy for relation "tenant_users"`.
- Jeg kan nu se den konkrete årsag i nuværende RLS:
  - `tenant_users` INSERT-policyen (`Tenant owners insert tenant_users`) bruger `WITH CHECK` med direkte query mod `tenants`.
  - `tenants` SELECT-policyen refererer samtidig `tenant_users`.
  - Når man gemmer “Rediger virksomhedstilknytning” og der skal laves INSERT i `tenant_users`, opstår cirkulær policy-evaluering.

Do I know what the issue is?
- Ja. Det er INSERT-policyen på `tenant_users` (ikke DELETE-policyen) der stadig skaber recursion.

Implementeringsplan
1) Lav en ny migration, der erstatter INSERT-policyen på `tenant_users`:
```sql
DROP POLICY IF EXISTS "Tenant owners insert tenant_users" ON public.tenant_users;

CREATE POLICY "Tenant owners insert tenant_users"
  ON public.tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT owned_tenant_ids(auth.uid()))
    OR is_operator()
  );
```

2) Ingen frontend-ændringer i denne omgang
- `SettingsPage.tsx` save-flow er ok; fejlen kommer fra backend policy-laget.
- Når policyen er rettet, vil samme UI-flow kunne gemme virksomhedstilknytninger uden recursion.

3) Verifikation efter ændringen
- Åbn “Rediger virksomhedstilknytning” for en postmodtager.
- Test både:
  - kun fjerne en virksomhed (DELETE)
  - tilføje en virksomhed (INSERT)
- Bekræft at “Gem” gennemføres uden fejl-toast, og at listen opdateres korrekt efter refresh.

Teknisk note
- Vi genbruger eksisterende `owned_tenant_ids()` (SECURITY DEFINER), som netop er lavet for at undgå RLS-recursion.
- Dette følger samme sikre mønster som den allerede rettede DELETE-policy.
