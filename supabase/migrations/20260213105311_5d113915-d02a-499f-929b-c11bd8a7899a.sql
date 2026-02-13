
-- 1. Add scan_url column to mail_items
ALTER TABLE public.mail_items ADD COLUMN scan_url text;

-- 2. Create private storage bucket for scanned documents
INSERT INTO storage.buckets (id, name, public) VALUES ('mail-scans', 'mail-scans', false);

-- 3. RLS policies for mail-scans bucket
-- Operators can upload files
CREATE POLICY "Operators can upload scans"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mail-scans' AND public.is_operator());

-- Operators can read all scans
CREATE POLICY "Operators can read scans"
ON storage.objects FOR SELECT
USING (bucket_id = 'mail-scans' AND public.is_operator());

-- Tenants can read scans for their own mail items
CREATE POLICY "Tenants can read own scans"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mail-scans'
  AND EXISTS (
    SELECT 1 FROM public.mail_items mi
    JOIN public.tenants t ON t.id = mi.tenant_id
    WHERE mi.scan_url LIKE '%' || storage.objects.name
    AND t.user_id = auth.uid()
  )
);

-- 4. Trigger to notify tenant when scan is uploaded
CREATE OR REPLACE FUNCTION public.notify_tenant_on_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF OLD.scan_url IS NOT NULL OR NEW.scan_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _user_id
  FROM tenants WHERE id = NEW.tenant_id;

  IF _user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (
      _user_id,
      NEW.id,
      'Scanning klar',
      'Din forsendelse' ||
      CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END ||
      ' er blevet scannet og er klar til download.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_tenant_on_scan
BEFORE UPDATE ON public.mail_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_tenant_on_scan();
