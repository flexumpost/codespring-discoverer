DROP POLICY "Tenants update own tenant" ON public.tenants;

CREATE POLICY "Tenants update own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_type_id = (SELECT t.tenant_type_id FROM public.tenants t WHERE t.id = tenants.id)
  );