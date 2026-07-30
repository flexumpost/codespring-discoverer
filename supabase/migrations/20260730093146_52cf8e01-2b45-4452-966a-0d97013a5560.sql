ALTER TABLE public.mail_items DISABLE TRIGGER USER;

UPDATE public.mail_items SET status = 'sendt_retur'
WHERE status IN ('ny','afventer_handling','ulaest','laest')
AND tenant_id IN (
  SELECT t.id FROM public.tenants t
  JOIN public.tenant_types tt ON tt.id = t.tenant_type_id
  WHERE tt.name IN ('Retur til afsender','Nabo')
);

ALTER TABLE public.mail_items ENABLE TRIGGER USER;