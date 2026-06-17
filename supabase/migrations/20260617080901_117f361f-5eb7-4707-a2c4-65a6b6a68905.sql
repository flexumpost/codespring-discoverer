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
    -- Forretningsregel: pakker har altid "Forsendelse" (send) som standard
    IF _default_action IS NULL OR _default_action = '' THEN
      _default_action := 'send';
    END IF;
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

  IF NEW.mail_type <> 'pakke' AND _default_action = 'scan' THEN
    IF _tier_name IS DISTINCT FROM 'Plus' THEN
      _default_action := 'standard_scan';
    END IF;
  END IF;

  IF NEW.mail_type <> 'pakke' AND _default_action = 'send' AND _tier_name = 'Lite' THEN
    _default_action := 'standard_forsendelse';
  END IF;

  NEW.chosen_action := _default_action;
  NEW.status := 'afventer_handling';

  RETURN NEW;
END;
$function$;

-- Ensure trigger also fires when tenant_id is set after creation
DROP TRIGGER IF EXISTS apply_tenant_default_action_trg ON public.mail_items;
DROP TRIGGER IF EXISTS apply_tenant_default_action_insert ON public.mail_items;
DROP TRIGGER IF EXISTS apply_tenant_default_action_update ON public.mail_items;

CREATE TRIGGER apply_tenant_default_action_insert
BEFORE INSERT ON public.mail_items
FOR EACH ROW
EXECUTE FUNCTION public.apply_tenant_default_action();

CREATE TRIGGER apply_tenant_default_action_update
BEFORE UPDATE OF tenant_id ON public.mail_items
FOR EACH ROW
WHEN (NEW.tenant_id IS NOT NULL AND NEW.chosen_action IS NULL AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id)
EXECUTE FUNCTION public.apply_tenant_default_action();
