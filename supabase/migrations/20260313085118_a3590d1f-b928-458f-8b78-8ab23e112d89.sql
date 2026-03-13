DROP POLICY "Users read own tenant_users" ON public.tenant_users;
CREATE POLICY "Users read own tenant_users" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_operator()
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );