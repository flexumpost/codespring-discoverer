-- Fix 1: Restrict mail_item_logs INSERT to service_role only
DROP POLICY "System inserts logs" ON public.mail_item_logs;
CREATE POLICY "System inserts logs" ON public.mail_item_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Fix 2: Replace overly permissive profiles SELECT with scoped policies
DROP POLICY "Authenticated can read profiles" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Operators read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_operator());