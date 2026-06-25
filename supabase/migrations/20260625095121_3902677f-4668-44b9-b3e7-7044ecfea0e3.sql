DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;

CREATE POLICY "Tenants update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());