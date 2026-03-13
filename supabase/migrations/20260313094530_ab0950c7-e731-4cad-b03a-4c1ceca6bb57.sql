CREATE POLICY "Tenant owners delete tenant_users" ON public.tenant_users
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));