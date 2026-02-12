
-- 1. Opret funktion til at linke bruger til tenant ved oprettelse
CREATE OR REPLACE FUNCTION public.link_user_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET user_id = NEW.id
  WHERE contact_email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- 2. Opret trigger på auth.users
CREATE TRIGGER on_auth_user_created_link_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_to_tenant();

-- 3. Ret eksisterende data: kobl brugere til tenants via email
UPDATE tenants t
SET user_id = u.id
FROM auth.users u
WHERE t.contact_email = u.email
  AND t.user_id IS NULL;
