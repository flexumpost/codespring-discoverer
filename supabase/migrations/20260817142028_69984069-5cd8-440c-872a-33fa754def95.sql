CREATE TABLE public.officernd_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  invoice_id text NOT NULL UNIQUE,
  member_id text,
  member_email text,
  status text NOT NULL,
  amount numeric,
  due_date date,
  raw jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_officernd_invoices_tenant ON public.officernd_invoices(tenant_id);
CREATE INDEX idx_officernd_invoices_status ON public.officernd_invoices(status);

GRANT SELECT ON public.officernd_invoices TO authenticated;
GRANT ALL ON public.officernd_invoices TO service_role;
ALTER TABLE public.officernd_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can view invoices" ON public.officernd_invoices
  FOR SELECT TO authenticated USING (public.is_operator());

CREATE TRIGGER update_officernd_invoices_updated_at
  BEFORE UPDATE ON public.officernd_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.officernd_invoice_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  invoice_id text,
  old_status text,
  new_status text,
  flag_before boolean,
  flag_after boolean,
  source text NOT NULL DEFAULT 'webhook',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_officernd_invoice_log_created ON public.officernd_invoice_log(created_at DESC);

GRANT SELECT ON public.officernd_invoice_log TO authenticated;
GRANT ALL ON public.officernd_invoice_log TO service_role;
ALTER TABLE public.officernd_invoice_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can view invoice log" ON public.officernd_invoice_log
  FOR SELECT TO authenticated USING (public.is_operator());