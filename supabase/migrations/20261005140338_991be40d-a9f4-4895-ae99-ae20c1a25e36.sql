CREATE OR REPLACE FUNCTION public.notify_tenant_address_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _op record;
  _key text;
  _by_tenant boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (NEW.shipping_recipient, NEW.shipping_co, NEW.shipping_address, NEW.shipping_address_2,
      NEW.shipping_zip, NEW.shipping_city, NEW.shipping_state, NEW.shipping_country)
     IS NOT DISTINCT FROM
     (OLD.shipping_recipient, OLD.shipping_co, OLD.shipping_address, OLD.shipping_address_2,
      OLD.shipping_zip, OLD.shipping_city, OLD.shipping_state, OLD.shipping_country) THEN
    RETURN NEW;
  END IF;

  _by_tenant := NOT public.has_role(auth.uid(), 'operator');

  IF _by_tenant THEN
    FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
      INSERT INTO notifications (user_id, title, message)
      VALUES (_op.user_id, 'Adresseændring',
        NEW.company_name || ' har ændret forsendelsesadresse til: ' ||
        concat_ws(', ', NEW.shipping_address, NULLIF(trim(concat_ws(' ', NEW.shipping_zip, NEW.shipping_city)), ''), NEW.shipping_country) || '.');
    END LOOP;
  END IF;

  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  IF _key IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://hokiuavxyoymcenqlvly.supabase.co/functions/v1/sync-address-to-zoho',
      body := jsonb_build_object('tenant_id', NEW.id, 'by_tenant', _by_tenant),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _key)
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_tenant_address_change() FROM PUBLIC, anon, authenticated;