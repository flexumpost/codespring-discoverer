ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.prevent_tenant_self_type_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_operator() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_type_id IS DISTINCT FROM OLD.tenant_type_id THEN
    RAISE EXCEPTION 'Tenants cannot change their own tenant_type_id';
  END IF;
  IF NEW.is_partner IS DISTINCT FROM OLD.is_partner THEN
    RAISE EXCEPTION 'Tenants cannot change their own partner flag';
  END IF;
  RETURN NEW;
END;
$function$;