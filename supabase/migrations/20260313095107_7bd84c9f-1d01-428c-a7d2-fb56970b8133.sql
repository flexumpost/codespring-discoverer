DROP POLICY "Tenant owners delete tenant_users" ON public.tenant_users;

CREATE POLICY "Tenant owners delete tenant_users" ON public.tenant_users
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT owned_tenant_ids(auth.uid())));