ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billed_by_email text,
  ADD COLUMN IF NOT EXISTS billed_by_company text;