
DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;

CREATE POLICY "Tenants update own tenant"
ON public.tenants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND tenant_type_id IS NOT DISTINCT FROM (SELECT t.tenant_type_id FROM public.tenants t WHERE t.id = tenants.id)
);

CREATE POLICY "Service role manages onboarding tokens"
ON public.onboarding_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
