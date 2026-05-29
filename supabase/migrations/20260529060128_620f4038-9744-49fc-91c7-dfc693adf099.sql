
DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;

CREATE POLICY "Tenants update own tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_tenant_self_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_operator() THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_type_id IS DISTINCT FROM OLD.tenant_type_id THEN
    RAISE EXCEPTION 'Tenants cannot change their own tenant_type_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_tenant_self_type_change_trg ON public.tenants;
CREATE TRIGGER prevent_tenant_self_type_change_trg
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.prevent_tenant_self_type_change();
