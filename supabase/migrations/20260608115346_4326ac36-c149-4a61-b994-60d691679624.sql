
DROP POLICY IF EXISTS "Tenants update own mail action" ON public.mail_items;

CREATE POLICY "Tenants update own mail action"
ON public.mail_items
FOR UPDATE
USING (tenant_id IN (SELECT public.my_tenant_ids()))
WITH CHECK (tenant_id IN (SELECT public.my_tenant_ids()));

CREATE OR REPLACE FUNCTION public.enforce_tenant_mail_item_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_operator() THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id    IS DISTINCT FROM OLD.tenant_id    THEN RAISE EXCEPTION 'tenant_id is immutable for tenants'; END IF;
  IF NEW.status       IS DISTINCT FROM OLD.status       THEN RAISE EXCEPTION 'status is immutable for tenants'; END IF;
  IF NEW.operator_id  IS DISTINCT FROM OLD.operator_id  THEN RAISE EXCEPTION 'operator_id is immutable for tenants'; END IF;
  IF NEW.mail_type    IS DISTINCT FROM OLD.mail_type    THEN RAISE EXCEPTION 'mail_type is immutable for tenants'; END IF;
  IF NEW.sender_name  IS DISTINCT FROM OLD.sender_name  THEN RAISE EXCEPTION 'sender_name is immutable for tenants'; END IF;
  IF NEW.photo_url    IS DISTINCT FROM OLD.photo_url    THEN RAISE EXCEPTION 'photo_url is immutable for tenants'; END IF;
  IF NEW.scan_url     IS DISTINCT FROM OLD.scan_url     THEN RAISE EXCEPTION 'scan_url is immutable for tenants'; END IF;
  IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN RAISE EXCEPTION 'tracking_number is immutable for tenants'; END IF;
  IF NEW.stamp_number IS DISTINCT FROM OLD.stamp_number THEN RAISE EXCEPTION 'stamp_number is immutable for tenants'; END IF;
  IF NEW.porto_option IS DISTINCT FROM OLD.porto_option THEN RAISE EXCEPTION 'porto_option is immutable for tenants'; END IF;
  IF NEW.is_registered IS DISTINCT FROM OLD.is_registered THEN RAISE EXCEPTION 'is_registered is immutable for tenants'; END IF;
  IF NEW.received_at  IS DISTINCT FROM OLD.received_at  THEN RAISE EXCEPTION 'received_at is immutable for tenants'; END IF;
  IF NEW.scanned_at   IS DISTINCT FROM OLD.scanned_at   THEN RAISE EXCEPTION 'scanned_at is immutable for tenants'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_mail_item_immutability_trg ON public.mail_items;
CREATE TRIGGER enforce_tenant_mail_item_immutability_trg
BEFORE UPDATE ON public.mail_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tenant_mail_item_immutability();
