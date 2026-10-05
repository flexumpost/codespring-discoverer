CREATE OR REPLACE FUNCTION public.notify_tenant_address_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _op record;
  _key text;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'operator') THEN
    RETURN NEW;
  END IF;
  IF (NEW.shipping_recipient, NEW.shipping_co, NEW.shipping_address, NEW.shipping_address_2,
      NEW.shipping_zip, NEW.shipping_city, NEW.shipping_state, NEW.shipping_country)
     IS NOT DISTINCT FROM
     (OLD.shipping_recipient, OLD.shipping_co, OLD.shipping_address, OLD.shipping_address_2,
      OLD.shipping_zip, OLD.shipping_city, OLD.shipping_state, OLD.shipping_country) THEN
    RETURN NEW;
  END IF;

  FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
    INSERT INTO notifications (user_id, title, message)
    VALUES (_op.user_id, 'Adresseændring',
      NEW.company_name || ' har ændret forsendelsesadresse til: ' ||
      concat_ws(', ', NEW.shipping_address, NULLIF(trim(concat_ws(' ', NEW.shipping_zip, NEW.shipping_city)), ''), NEW.shipping_country) || '.');
  END LOOP;

  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  IF _key IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://hokiuavxyoymcenqlvly.supabase.co/functions/v1/sync-address-to-zoho',
      body := jsonb_build_object('tenant_id', NEW.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _key)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_tenant_address_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_tenant_address_change ON public.tenants;
CREATE TRIGGER trg_notify_tenant_address_change
AFTER UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_address_change();