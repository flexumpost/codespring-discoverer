ALTER TABLE public.mail_items DISABLE TRIGGER USER;

UPDATE public.mail_items mi
SET chosen_action = CASE WHEN tt.name = 'Lite' THEN 'standard_forsendelse' ELSE 'send' END,
    status = 'afventer_handling'
FROM public.tenants t
JOIN public.tenant_types tt ON tt.id = t.tenant_type_id
WHERE mi.tenant_id = t.id
  AND mi.mail_type <> 'pakke'
  AND mi.chosen_action IS NULL
  AND mi.scan_url IS NULL
  AND mi.status = 'ny'
  AND (t.default_mail_action IS NULL OR t.default_mail_action = '');

ALTER TABLE public.mail_items ENABLE TRIGGER USER;