ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_mail_pickup_hour integer,
  ADD COLUMN IF NOT EXISTS default_package_pickup_hour integer;
ALTER TABLE public.tenants ALTER COLUMN default_mail_action SET DEFAULT 'send';
ALTER TABLE public.tenants ALTER COLUMN default_package_action SET DEFAULT 'send';

CREATE OR REPLACE FUNCTION public.validate_tenant_default_actions()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.default_package_action IS NOT NULL AND NEW.default_package_action NOT IN ('send','afhentning') THEN
    RAISE EXCEPTION 'Ugyldig standardhandling for pakker';
  END IF;
  IF NEW.default_mail_action = 'afhentning' AND (NEW.default_mail_pickup_hour IS NULL OR NEW.default_mail_pickup_hour NOT BETWEEN 9 AND 16) THEN
    RAISE EXCEPTION 'Vælg et tidsrum for afhentning af breve';
  END IF;
  IF NEW.default_package_action = 'afhentning' AND (NEW.default_package_pickup_hour IS NULL OR NEW.default_package_pickup_hour NOT BETWEEN 9 AND 16) THEN
    RAISE EXCEPTION 'Vælg et tidsrum for afhentning af pakker';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.next_default_pickup(_tier text, _is_package boolean, _hour integer)
 RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Copenhagen')::date;
  _d date; _dow int; _ok boolean; _ts timestamptz;
BEGIN
  FOR i IN 0..120 LOOP
    _d := _today + i;
    _dow := extract(dow FROM _d);
    CONTINUE WHEN _dow IN (0,6);
    CONTINUE WHEN EXISTS (SELECT 1 FROM closed_days WHERE date = _d);
    CONTINUE WHEN _d BETWEEN DATE '2026-08-31' AND DATE '2026-09-27';
    CONTINUE WHEN _dow = 5 AND _hour > 14;
    IF _is_package THEN _ok := true;
    ELSE
      _ok := CASE
        WHEN _tier = 'Lite' THEN _dow = 4 AND extract(day FROM _d) <= 7
        WHEN _tier IN ('Standard','Professional') THEN _dow IN (1,4)
        WHEN _tier IN ('Plus','Executive') THEN true
        ELSE _dow = 4 END;
    END IF;
    CONTINUE WHEN NOT _ok;
    _ts := (_d + make_time(_hour,0,0)) AT TIME ZONE 'Europe/Copenhagen';
    CONTINUE WHEN _ts < now() + interval '2 hours';
    RETURN _ts;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.next_default_pickup(text, boolean, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_tenant_default_action()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _default_action text;
  _tier_name text;
  _raw_tier text;
  _hour int;
  _pickup timestamptz;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  SELECT tt.name INTO _tier_name
  FROM public.tenants t JOIN public.tenant_types tt ON tt.id = t.tenant_type_id
  WHERE t.id = NEW.tenant_id;
  _raw_tier := _tier_name;

  IF _tier_name = 'Retur til afsender' THEN
    NEW.chosen_action := NULL;
    NEW.status := 'sendt_retur';
    RETURN NEW;
  END IF;

  _tier_name := CASE _tier_name
    WHEN 'Essential' THEN 'Standard'
    WHEN 'Professional' THEN 'Standard'
    WHEN 'Executive' THEN 'Plus'
    ELSE _tier_name END;

  IF NEW.chosen_action IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.mail_type = 'pakke' THEN
    SELECT default_package_action, default_package_pickup_hour INTO _default_action, _hour FROM public.tenants WHERE id = NEW.tenant_id;
  ELSE
    SELECT default_mail_action, default_mail_pickup_hour INTO _default_action, _hour FROM public.tenants WHERE id = NEW.tenant_id;
  END IF;

  IF _default_action IS NULL OR _default_action = '' THEN _default_action := 'send'; END IF;

  IF _default_action = 'afhentning' THEN
    IF _hour IS NULL THEN RETURN NEW; END IF;
    _pickup := public.next_default_pickup(_raw_tier, NEW.mail_type = 'pakke', _hour);
    IF _pickup IS NULL THEN RETURN NEW; END IF;
    NEW.pickup_date := _pickup;
    NEW.chosen_action := CASE WHEN NEW.mail_type <> 'pakke' AND _raw_tier = 'Lite' THEN 'gratis_afhentning' ELSE 'afhentning' END;
    NEW.status := 'afventer_handling';
    RETURN NEW;
  END IF;

  IF NEW.mail_type <> 'pakke' AND _default_action = 'scan' AND _tier_name IS DISTINCT FROM 'Plus' THEN
    _default_action := 'standard_scan';
  END IF;
  IF NEW.mail_type <> 'pakke' AND _default_action = 'send' AND _tier_name = 'Lite' THEN
    _default_action := 'standard_forsendelse';
  END IF;

  NEW.chosen_action := _default_action;
  NEW.status := 'afventer_handling';
  RETURN NEW;
END;
$function$;