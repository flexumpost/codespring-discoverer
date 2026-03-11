
-- Funktion: Når en tenant oprettes/opdateres, find bruger via email
CREATE OR REPLACE FUNCTION public.link_tenant_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_email IS NOT NULL THEN
    SELECT id INTO NEW.user_id
    FROM auth.users
    WHERE email = NEW.contact_email
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger på tenants ved INSERT og UPDATE af contact_email
CREATE TRIGGER on_tenant_upsert_link_user
  BEFORE INSERT OR UPDATE OF contact_email ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.link_tenant_to_user();
