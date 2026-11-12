DROP POLICY IF EXISTS "Anyone can read pricing" ON public.pricing_settings;
CREATE POLICY "Anyone can read pricing" ON public.pricing_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can read tenant types" ON public.tenant_types;
CREATE POLICY "Authenticated can read tenant types" ON public.tenant_types FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can read closed_days" ON public.closed_days;
CREATE POLICY "Authenticated can read closed_days" ON public.closed_days FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS returned_letter_photos_read ON storage.objects;
CREATE POLICY returned_letter_photos_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'returned-letters' AND (
    public.is_operator() OR EXISTS (
      SELECT 1 FROM public.returned_letters r
      WHERE r.photo_path = objects.name
        AND r.tenant_id IN (SELECT public.my_tenant_ids())
    )
  )
);