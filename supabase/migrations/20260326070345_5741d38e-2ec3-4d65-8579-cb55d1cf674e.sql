CREATE POLICY "Tenants read co-tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tu.user_id FROM public.tenant_users tu
      WHERE tu.tenant_id IN (
        SELECT tu2.tenant_id FROM public.tenant_users tu2
        WHERE tu2.user_id = auth.uid()
      )
    )
    OR
    id IN (
      SELECT t.user_id FROM public.tenants t
      WHERE t.user_id = auth.uid()
    )
  );