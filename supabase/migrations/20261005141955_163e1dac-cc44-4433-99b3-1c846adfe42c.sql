CREATE OR REPLACE FUNCTION public.notify_tenant_address_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _op record;
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
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_tenant_address_change() FROM PUBLIC, anon, authenticated;