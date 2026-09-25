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
  IF _prev IS NULL OR _prev IN ('ny','afventer_handling','ulaest','laest') THEN
    UPDATE mail_items SET status = COALESCE(_prev,'afventer_handling')::mail_status, chosen_action = NULL WHERE id = _id;
    RETURN COALESCE(_prev,'afventer_handling');
  END IF;
  UPDATE mail_items SET status = _prev::mail_status WHERE id = _id;
  RETURN _prev;
END $$;
GRANT EXECUTE ON FUNCTION public.restore_archived_mail_item(uuid) TO authenticated;