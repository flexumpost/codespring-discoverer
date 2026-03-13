DROP POLICY IF EXISTS "Tenant owners insert tenant_users" ON public.tenant_users;

CREATE POLICY "Tenant owners insert tenant_users"
  ON public.tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT owned_tenant_ids(auth.uid()))
    OR is_operator()
  );