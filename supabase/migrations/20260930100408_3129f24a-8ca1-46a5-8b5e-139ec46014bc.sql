DO $$
DECLARE f text;
BEGIN
  -- Trigger & internal/queue functions: nobody calls these directly
  FOREACH f IN ARRAY ARRAY[
    'apply_tenant_default_action()','enforce_tenant_mail_item_immutability()','handle_new_user()',
    'link_tenant_to_user()','link_user_to_tenant()','log_mail_item_changes()','log_mail_item_created()',
    'notify_officernd_on_archive()','notify_operator_on_destruction_request()','notify_operator_on_destruction_request_insert()',
    'notify_operator_on_scan_request()','notify_operator_on_scan_request_insert()','notify_tenant_on_mail()',
    'notify_tenant_on_scan()','prevent_tenant_self_type_change()','email_queue_dispatch()','email_queue_wake()',
    'delete_email(text,bigint)','enqueue_email(text,jsonb)','move_to_dlq(text,text,bigint,jsonb)','read_email_batch(text,integer,integer)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
  -- Helpers used by access rules / app: signed-in users only
  FOREACH f IN ARRAY ARRAY[
    'has_role(uuid,app_role)','is_operator()','my_tenant_ids()','owned_tenant_ids(uuid)',
    'tenant_type_matches(uuid,uuid)','tenant_type_unchanged(uuid,uuid)',
    'mail_item_operator_fields_unchanged(uuid,text,uuid,text,text,text,text,text,integer,text,boolean,timestamptz,timestamptz,uuid)',
    'archive_mail_item(uuid)','restore_archived_mail_item(uuid)','get_login_logs(text,text,integer,integer)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- Login log must only be readable by operators
CREATE OR REPLACE FUNCTION public.get_login_logs(_role text, _search text DEFAULT ''::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, email text, logged_in_at timestamp with time zone, last_seen_at timestamp with time zone, total_count bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT l.id, l.user_id, l.email, l.logged_in_at, l.last_seen_at, COUNT(*) OVER() AS total_count
  FROM login_logs l
  WHERE public.is_operator()
    AND CASE WHEN _role = 'operator'
      THEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
      ELSE NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
    END
    AND (_search = '' OR l.email ILIKE '%' || _search || '%')
  ORDER BY l.logged_in_at DESC
  LIMIT _limit OFFSET _offset
$function$;