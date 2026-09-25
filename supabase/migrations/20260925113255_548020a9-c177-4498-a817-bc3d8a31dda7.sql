CREATE OR REPLACE FUNCTION public.archive_mail_item(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _item mail_items;
BEGIN
  SELECT * INTO _item FROM mail_items WHERE id = _id;
  IF _item.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT (public.is_operator() OR _item.tenant_id IN (SELECT public.my_tenant_ids())) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _item.status = 'arkiveret' THEN RETURN 'arkiveret'; END IF;
  IF NOT public.is_operator() AND NOT (
    _item.status IN ('sendt_med_dao','sendt_med_postnord','sendt_retur')
    OR _item.scan_url IS NOT NULL
    OR _item.chosen_action IN ('afhentet','destruer')
  ) THEN
    RAISE EXCEPTION 'not completed';
  END IF;
  PERFORM set_config('app.restore_archive', 'on', true);
  UPDATE mail_items SET status = 'arkiveret' WHERE id = _id;
  PERFORM set_config('app.restore_archive', 'off', true);
  RETURN 'arkiveret';
END $$;
REVOKE ALL ON FUNCTION public.archive_mail_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_mail_item(uuid) TO authenticated;