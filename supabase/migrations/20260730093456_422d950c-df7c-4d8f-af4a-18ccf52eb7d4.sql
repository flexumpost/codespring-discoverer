-- mail_items: tenant update policy -> authenticated
DROP POLICY IF EXISTS "Tenants update own mail action" ON public.mail_items;
CREATE POLICY "Tenants update own mail action" ON public.mail_items
FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT my_tenant_ids()))
WITH CHECK (
  tenant_id IN (SELECT my_tenant_ids())
  AND mail_item_operator_fields_unchanged(id, status::text, operator_id, mail_type::text, sender_name, photo_url, scan_url, tracking_number, stamp_number, porto_option, is_registered, received_at, scanned_at, tenant_id)
);

-- notifications -> authenticated
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- tenants -> authenticated
DROP POLICY IF EXISTS "Tenants update own tenant" ON public.tenants;
CREATE POLICY "Tenants update own tenant" ON public.tenants
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND tenant_type_unchanged(id, tenant_type_id));

-- service-role-only policies -> service_role grantee
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log
FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log
FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log
FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails
FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails
FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens
FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens
FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens
FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages login_logs" ON public.login_logs;
CREATE POLICY "Service role manages login_logs" ON public.login_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages sync logs" ON public.officernd_sync_log;
CREATE POLICY "Service role manages sync logs" ON public.officernd_sync_log
FOR ALL TO service_role USING (true) WITH CHECK (true);