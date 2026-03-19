-- Create SECURITY DEFINER function to check tenant_type_id without triggering RLS
CREATE OR REPLACE FUNCTION public.tenant_type_matches(_tenant_id uuid, _tenant_type_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id AND tenant_type_id = _tenant_type_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;

-- Recreate without recursive subquery
CREATE POLICY "Tenants update own tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND public.tenant_type_matches(id, tenant_type_id));