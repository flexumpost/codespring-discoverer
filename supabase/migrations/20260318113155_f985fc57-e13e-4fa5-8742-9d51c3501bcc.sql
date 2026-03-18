CREATE POLICY "Operators can delete scans"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mail-scans' AND public.is_operator());

CREATE POLICY "Operators can update scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mail-scans' AND public.is_operator());