DROP POLICY IF EXISTS "Operators can delete mail photos" ON storage.objects;
CREATE POLICY "Operators can delete mail photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mail-photos' AND public.is_operator());

DROP POLICY IF EXISTS "Operators can read mail photos" ON storage.objects;
CREATE POLICY "Operators can read mail photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mail-photos' AND public.is_operator());

DROP POLICY IF EXISTS "Operators can upload mail photos" ON storage.objects;
CREATE POLICY "Operators can upload mail photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mail-photos' AND public.is_operator());

DROP POLICY IF EXISTS "Tenants can read own mail photos" ON storage.objects;
CREATE POLICY "Tenants can read own mail photos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'mail-photos' AND EXISTS (
    SELECT 1 FROM public.mail_items mi
    WHERE mi.photo_url LIKE '%' || objects.name
      AND mi.tenant_id IN (SELECT public.my_tenant_ids())
  )
);

DROP POLICY IF EXISTS "Tenant owners delete tenant_users" ON public.tenant_users;
CREATE POLICY "Tenant owners delete tenant_users" ON public.tenant_users FOR DELETE TO authenticated USING (
  tenant_id IN (SELECT public.owned_tenant_ids(auth.uid())) AND user_id <> auth.uid()
);