
CREATE OR REPLACE FUNCTION public.owned_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = _user_id
$$;

DROP POLICY "Users read own tenant_users" ON public.tenant_users;
CREATE POLICY "Users read own tenant_users" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_operator()
    OR tenant_id IN (SELECT owned_tenant_ids(auth.uid()))
  );
