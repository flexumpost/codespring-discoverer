ALTER TABLE public.officernd_invoices ADD COLUMN IF NOT EXISTS team_id text;
CREATE INDEX IF NOT EXISTS officernd_invoices_team_id_idx ON public.officernd_invoices (team_id);