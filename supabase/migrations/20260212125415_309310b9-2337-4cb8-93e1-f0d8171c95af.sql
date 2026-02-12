
-- Create mail-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('mail-photos', 'mail-photos', true);

-- Operators can upload photos
CREATE POLICY "Operators can upload mail photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mail-photos' AND public.is_operator());

-- Operators can read all photos
CREATE POLICY "Operators can read mail photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'mail-photos' AND public.is_operator());

-- Tenants can read photos for their own mail items
CREATE POLICY "Tenants can read own mail photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mail-photos'
  AND EXISTS (
    SELECT 1 FROM public.mail_items mi
    WHERE mi.photo_url LIKE '%' || name
    AND mi.tenant_id IN (SELECT public.my_tenant_ids())
  )
);

-- Operators can delete photos
CREATE POLICY "Operators can delete mail photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'mail-photos' AND public.is_operator());
