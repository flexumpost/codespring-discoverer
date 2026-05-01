-- 1. Opdater apply_tenant_default_action til at springe over "afhentning"
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

  -- "Afhentning" må aldrig være standard – lejer skal selv booke et tidspunkt
  IF _default_action = 'afhentning' THEN
    RETURN NEW;
  END IF;

  -- For breve med default 'scan': map til standard_scan (gratis næste planlagte scandag)
  -- undtagen Plus-lejere som får scan med det samme uden gebyr.
  IF NEW.mail_type <> 'pakke' AND _default_action = 'scan' THEN
    SELECT tt.name INTO _tier_name
    FROM public.tenants t
    JOIN public.tenant_types tt ON tt.id = t.tenant_type_id
    WHERE t.id = NEW.tenant_id;

    IF _tier_name IS DISTINCT FROM 'Plus' THEN
      _default_action := 'standard_scan';
    END IF;
  END IF;

  NEW.chosen_action := _default_action;
  NEW.status := 'afventer_handling';

  RETURN NEW;
END;
$function$;

-- 2. Valideringstrigger på tenants
CREATE OR REPLACE FUNCTION public.validate_tenant_default_actions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.default_mail_action = 'afhentning' OR NEW.default_package_action = 'afhentning' THEN
    RAISE EXCEPTION 'Afhentning kan ikke vælges som standardhandling – lejer skal selv booke et tidspunkt';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_tenant_default_actions_trg ON public.tenants;
CREATE TRIGGER validate_tenant_default_actions_trg
BEFORE INSERT OR UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_default_actions();