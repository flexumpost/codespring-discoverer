CREATE OR REPLACE FUNCTION public.notify_officernd_on_archive()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _enabled boolean;
  _supabase_url text := 'https://hokiuavxyoymcenqlvly.supabase.co';
  _service_role_key text;
BEGIN
  IF NEW.status <> 'arkiveret' THEN RETURN NEW; END IF;
  IF OLD.status = 'arkiveret' THEN RETURN NEW; END IF;

  SELECT enabled INTO _enabled FROM public.officernd_settings WHERE id = 1;
  IF NOT FOUND OR NOT _enabled THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/sync-officernd-charge',
    body := jsonb_build_object('mail_item_id', NEW.id)::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )::jsonb
  );

  RETURN NEW;
END;
$function$;