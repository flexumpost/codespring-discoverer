REVOKE EXECUTE ON FUNCTION public.restore_archived_mail_item(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.enforce_tenant_mail_item_immutability()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_operator() OR current_setting('app.restore_archive', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id    IS DISTINCT FROM OLD.tenant_id    THEN RAISE EXCEPTION 'tenant_id is immutable for tenants'; END IF;
  IF NEW.status       IS DISTINCT FROM OLD.status       THEN RAISE EXCEPTION 'status is immutable for tenants'; END IF;
  IF NEW.operator_id  IS DISTINCT FROM OLD.operator_id  THEN RAISE EXCEPTION 'operator_id is immutable for tenants'; END IF;
  IF NEW.mail_type    IS DISTINCT FROM OLD.mail_type    THEN RAISE EXCEPTION 'mail_type is immutable for tenants'; END IF;
  IF NEW.sender_name  IS DISTINCT FROM OLD.sender_name  THEN RAISE EXCEPTION 'sender_name is immutable for tenants'; END IF;
  IF NEW.photo_url    IS DISTINCT FROM OLD.photo_url    THEN RAISE EXCEPTION 'photo_url is immutable for tenants'; END IF;
  IF NEW.scan_url     IS DISTINCT FROM OLD.scan_url     THEN RAISE EXCEPTION 'scan_url is immutable for tenants'; END IF;
  IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN RAISE EXCEPTION 'tracking_number is immutable for tenants'; END IF;
  IF NEW.stamp_number IS DISTINCT FROM OLD.stamp_number THEN RAISE EXCEPTION 'stamp_number is immutable for tenants'; END IF;
  IF NEW.porto_option IS DISTINCT FROM OLD.porto_option THEN RAISE EXCEPTION 'porto_option is immutable for tenants'; END IF;
  IF NEW.is_registered IS DISTINCT FROM OLD.is_registered THEN RAISE EXCEPTION 'is_registered is immutable for tenants'; END IF;
  IF NEW.received_at  IS DISTINCT FROM OLD.received_at  THEN RAISE EXCEPTION 'received_at is immutable for tenants'; END IF;
  IF NEW.scanned_at   IS DISTINCT FROM OLD.scanned_at   THEN RAISE EXCEPTION 'scanned_at is immutable for tenants'; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_archived_mail_item(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item mail_items; _prev text;
BEGIN
  SELECT * INTO _item FROM mail_items WHERE id = _id;
  IF _item.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT (public.is_operator() OR _item.tenant_id IN (SELECT public.my_tenant_ids())) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _item.status <> 'arkiveret' THEN RETURN _item.status::text; END IF;
  SELECT old_value INTO _prev FROM mail_item_logs
   WHERE mail_item_id = _id AND action = 'status_changed' AND new_value = 'arkiveret'
     AND old_value IS NOT NULL AND old_value <> 'arkiveret'
   ORDER BY created_at DESC LIMIT 1;
  PERFORM set_config('app.restore_archive', 'on', true);
  IF _prev IS NULL OR _prev IN ('ny','afventer_handling','ulaest','laest') THEN
    UPDATE mail_items SET status = COALESCE(_prev,'afventer_handling')::mail_status, chosen_action = NULL WHERE id = _id;
  ELSE
    UPDATE mail_items SET status = _prev::mail_status WHERE id = _id;
  END IF;
  PERFORM set_config('app.restore_archive', 'off', true);
  RETURN COALESCE(_prev,'afventer_handling');
END $$;
REVOKE EXECUTE ON FUNCTION public.restore_archived_mail_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_archived_mail_item(uuid) TO authenticated;

DO $$ BEGIN
  PERFORM set_config('app.restore_archive', 'on', true);
  UPDATE public.mail_items SET status='sendt_med_dao', chosen_action='under_forsendelse' WHERE id='d24ce61c-8d65-4164-83a1-01b4ce075e8c';
END $$;