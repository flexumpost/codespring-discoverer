CREATE TABLE public.zoho_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  contact_email text,
  raw_status text,
  resolved_action text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_type_name text,
  address_transfer_status text,
  welcome_email_status text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  payload jsonb
);

GRANT SELECT ON public.zoho_webhook_logs TO authenticated;
GRANT ALL ON public.zoho_webhook_logs TO service_role;

ALTER TABLE public.zoho_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view zoho webhook logs"
ON public.zoho_webhook_logs FOR SELECT TO authenticated
USING (public.is_operator());

CREATE POLICY "Service role manages zoho webhook logs"
ON public.zoho_webhook_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX idx_zoho_webhook_logs_received_at ON public.zoho_webhook_logs (received_at DESC);