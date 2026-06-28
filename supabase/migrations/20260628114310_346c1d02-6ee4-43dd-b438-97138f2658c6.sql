
CREATE OR REPLACE FUNCTION public.tenant_type_unchanged(_id uuid, _tenant_type_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _id AND tenant_type_id IS NOT DISTINCT FROM _tenant_type_id
  )
$$;

DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;
CREATE POLICY "Tenants update own tenant" ON public.tenants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND public.tenant_type_unchanged(id, tenant_type_id)
);
