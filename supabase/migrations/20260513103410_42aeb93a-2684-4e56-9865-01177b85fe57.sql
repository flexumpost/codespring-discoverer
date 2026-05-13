
CREATE OR REPLACE FUNCTION public.apply_tenant_default_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _default_action text;
  _tier_name text;
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.chosen_action IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.mail_type = 'pakke' THEN
    SELECT default_package_action INTO _default_action
    FROM public.tenants WHERE id = NEW.tenant_id;
  ELSE
    SELECT default_mail_action INTO _default_action
    FROM public.tenants WHERE id = NEW.tenant_id;
  END IF;

  IF _default_action IS NULL OR _default_action = '' THEN
    RETURN NEW;
  END IF;

  IF _default_action = 'afhentning' THEN
    RETURN NEW;
  END IF;

  SELECT tt.name INTO _tier_name
  FROM public.tenants t
  JOIN public.tenant_types tt ON tt.id = t.tenant_type_id
  WHERE t.id = NEW.tenant_id;

  -- For breve med default 'scan': map til standard_scan undtagen Plus-lejere
  IF NEW.mail_type <> 'pakke' AND _default_action = 'scan' THEN
    IF _tier_name IS DISTINCT FROM 'Plus' THEN
      _default_action := 'standard_scan';
    END IF;
  END IF;

  -- For Lite-breve med default 'send': map til standard_forsendelse
  -- (1. torsdag i måneden i stedet for hver torsdag)
  IF NEW.mail_type <> 'pakke' AND _default_action = 'send' AND _tier_name = 'Lite' THEN
    _default_action := 'standard_forsendelse';
  END IF;

  NEW.chosen_action := _default_action;
  NEW.status := 'afventer_handling';

  RETURN NEW;
END;
$function$;
