ALTER TABLE public.mail_items DISABLE TRIGGER USER;
UPDATE public.mail_items SET status='ulaest'::mail_status WHERE stamp_number=3638;
ALTER TABLE public.mail_items ENABLE TRIGGER USER;