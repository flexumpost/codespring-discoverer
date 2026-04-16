CREATE OR REPLACE FUNCTION public.notify_operator_on_scan_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _op record; _stamp text;
BEGIN
  IF NEW.chosen_action IS DISTINCT FROM 'scan' THEN RETURN NEW; END IF;
  _stamp := CASE WHEN NEW.stamp_number IS NOT NULL 
    THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END;
  FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (_op.user_id, NEW.id, 'Scan-anmodning',
      'En lejer har anmodet om scanning af forsendelse' || _stamp || '.');
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_operator_on_scan_request_insert
  AFTER INSERT ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION notify_operator_on_scan_request_insert();