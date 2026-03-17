
-- Tenants: add new columns, migrate data, drop old column
ALTER TABLE public.tenants ADD COLUMN contact_first_name text;
ALTER TABLE public.tenants ADD COLUMN contact_last_name text;

UPDATE public.tenants SET
  contact_first_name = split_part(contact_name, ' ', 1),
  contact_last_name = CASE
    WHEN position(' ' in coalesce(contact_name,'')) > 0
    THEN substring(contact_name from position(' ' in contact_name) + 1)
    ELSE NULL
  END
WHERE contact_name IS NOT NULL;

ALTER TABLE public.tenants DROP COLUMN contact_name;

-- Profiles: add new columns, migrate data, drop old column
ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;

UPDATE public.profiles SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in coalesce(full_name,'')) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

ALTER TABLE public.profiles DROP COLUMN full_name;

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$;
