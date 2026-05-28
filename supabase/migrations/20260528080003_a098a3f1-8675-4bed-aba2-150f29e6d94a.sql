
-- 1. Fix mail-scans tenant read policy to use my_tenant_ids() (includes tenant_users members)
DROP POLICY IF EXISTS "Tenants can read own scans" ON storage.objects;
CREATE POLICY "Tenants can read own scans"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mail-scans'
  AND EXISTS (
    SELECT 1 FROM public.mail_items mi
    WHERE mi.scan_url LIKE '%' || storage.objects.name
      AND mi.tenant_id IN (SELECT public.my_tenant_ids())
  )
);

-- 2. Prevent tenant owners from changing their tenant_type_id (privilege escalation)
DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;
CREATE POLICY "Tenants update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND tenant_type_id = (SELECT tenant_type_id FROM public.tenants WHERE id = tenants.id)
);

-- 3. Revoke EXECUTE on trigger and internal helper SECURITY DEFINER functions
-- These are only called by Postgres triggers or service role edge functions
REVOKE EXECUTE ON FUNCTION public.apply_tenant_default_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_tenant_to_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_user_to_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mail_item_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mail_item_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_officernd_on_archive() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_operator_on_destruction_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_operator_on_destruction_request_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_operator_on_scan_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_operator_on_scan_request_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tenant_on_mail() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tenant_on_scan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 4. Restrict realtime.messages to authenticated users only (no broadcast/presence by anon)
-- App uses postgres_changes only; underlying table RLS still controls row visibility.
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
