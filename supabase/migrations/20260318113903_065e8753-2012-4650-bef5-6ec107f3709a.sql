DROP POLICY "System inserts notifications" ON public.notifications;

CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);