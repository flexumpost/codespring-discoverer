
-- 1. Update notify_tenant_on_scan to also set status = 'ulaest' when scan_url is uploaded
CREATE OR REPLACE FUNCTION public.notify_tenant_on_scan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  IF OLD.scan_url IS NOT NULL OR NEW.scan_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set status to ulaest when scan is uploaded
  NEW.status := 'ulaest';

  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _user_id
  FROM tenants WHERE id = NEW.tenant_id;

  IF _user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (
      _user_id,
      NEW.id,
      'Scanning klar',
      'Din forsendelse' ||
      CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END ||
      ' er blevet scannet og er klar til download.'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Create trigger for operator notification when tenant requests scan
CREATE OR REPLACE FUNCTION public.notify_operator_on_scan_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _op record;
  _stamp text;
BEGIN
  -- Only fire when chosen_action is set to 'scan' (from NULL or different value)
  IF NEW.chosen_action IS DISTINCT FROM 'scan' THEN
    RETURN NEW;
  END IF;
  IF OLD.chosen_action = 'scan' THEN
    RETURN NEW;
  END IF;

  _stamp := CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END;

  -- Notify all operators
  FOR _op IN
    SELECT user_id FROM user_roles WHERE role = 'operator'
  LOOP
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (
      _op.user_id,
      NEW.id,
      'Scan-anmodning',
      'En lejer har anmodet om scanning af forsendelse' || _stamp || '.'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trg_notify_operator_on_scan_request
  BEFORE UPDATE ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_operator_on_scan_request();

-- Ensure the notify_tenant_on_scan trigger exists
DROP TRIGGER IF EXISTS trg_notify_tenant_on_scan ON public.mail_items;
CREATE TRIGGER trg_notify_tenant_on_scan
  BEFORE UPDATE ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tenant_on_scan();
