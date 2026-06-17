ALTER TABLE public.mail_items DISABLE TRIGGER USER;

UPDATE public.mail_items SET is_registered = false WHERE mail_type = 'pakke' AND is_registered = true;

ALTER TABLE public.mail_items ENABLE TRIGGER USER;

ALTER TABLE public.mail_items
  ADD CONSTRAINT packages_not_registered
  CHECK (mail_type <> 'pakke' OR is_registered = false);