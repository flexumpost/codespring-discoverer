
-- Add scanned_at column
ALTER TABLE public.mail_items ADD COLUMN scanned_at timestamptz;

-- Backfill existing rows that already have a scan_url
UPDATE public.mail_items SET scanned_at = updated_at WHERE scan_url IS NOT NULL AND scanned_at IS NULL;

-- Trigger function to auto-set scanned_at when scan_url goes from NULL to a value
CREATE OR REPLACE FUNCTION public.set_scanned_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.scan_url IS NULL AND NEW.scan_url IS NOT NULL AND NEW.scanned_at IS NULL THEN
    NEW.scanned_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_scanned_at
BEFORE UPDATE ON public.mail_items
FOR EACH ROW
EXECUTE FUNCTION public.set_scanned_at();
