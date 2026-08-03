DROP POLICY IF EXISTS "Operators can read scans" ON storage.objects;
DROP POLICY IF EXISTS "Operators can upload scans" ON storage.objects;

CREATE POLICY "Operators can read scans"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mail-scans' AND public.is_operator());

CREATE POLICY "Operators can upload scans"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mail-scans' AND public.is_operator());