GRANT SELECT ON public.sms_preferences TO authenticated;
CREATE POLICY "Operators read SMS preferences" ON public.sms_preferences FOR SELECT TO authenticated USING (public.is_operator());