CREATE OR REPLACE FUNCTION public.notify_operator_on_scan_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _op record;
  _stamp text;
  _supabase_url text := 'https://hokiuavxyoymcenqlvly.supabase.co';
  _service_role_key text;
BEGIN
  IF NEW.chosen_action IS DISTINCT FROM 'scan' THEN
    RETURN NEW;
  END IF;
  IF OLD.chosen_action = 'scan' THEN
    RETURN NEW;
  END IF;

  _stamp := CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END;

  FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (_op.user_id, NEW.id, 'Scan-anmodning',
      'En lejer har anmodet om scanning af forsendelse' || _stamp || '.');
  END LOOP;

  -- Send email to operators via edge function
  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF _service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/notify-scan-request',
      body := jsonb_build_object('mail_item_id', NEW.id)::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_operator_on_scan_request_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _op record;
  _stamp text;
  _supabase_url text := 'https://hokiuavxyoymcenqlvly.supabase.co';
  _service_role_key text;
BEGIN
  IF NEW.chosen_action IS DISTINCT FROM 'scan' THEN RETURN NEW; END IF;

  _stamp := CASE WHEN NEW.stamp_number IS NOT NULL
    THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END;

  FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (_op.user_id, NEW.id, 'Scan-anmodning',
      'En lejer har anmodet om scanning af forsendelse' || _stamp || '.');
  END LOOP;

  -- Send email to operators via edge function
  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF _service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/notify-scan-request',
      body := jsonb_build_object('mail_item_id', NEW.id)::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$function$;