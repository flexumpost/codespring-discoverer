CREATE TABLE public.returned_letters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), operator_id uuid NOT NULL,
 photo_path text NOT NULL UNIQUE, sent_address text NOT NULL, recipient_name text NOT NULL DEFAULT '', email_subject text NOT NULL, email_body text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','notified','resend_requested','declined','resent')),
 email_sent_at timestamptz, responded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.returned_letters TO authenticated;
GRANT ALL ON public.returned_letters TO service_role;
ALTER TABLE public.returned_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY returned_letters_operator_read ON public.returned_letters FOR SELECT TO authenticated USING (public.is_operator());
CREATE POLICY returned_letters_tenant_read ON public.returned_letters FOR SELECT TO authenticated USING (status <> 'draft' AND tenant_id IN (SELECT public.my_tenant_ids()));
CREATE POLICY returned_letter_photos_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'returned-letters' AND EXISTS (SELECT 1 FROM public.returned_letters r WHERE r.photo_path = name));