
-- Function that applies tenant default action to a mail item
CREATE OR REPLACE FUNCTION public.apply_tenant_default_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _default_action text;
BEGIN
  -- Only act when tenant_id is set and chosen_action is null
  IF NEW.tenant_id IS NULL OR NEW.chosen_action IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the tenant's default action based on mail type
  IF NEW.mail_type = 'pakke' THEN
    SELECT default_package_action INTO _default_action
    FROM public.tenants WHERE id = NEW.tenant_id;
  ELSE
    SELECT default_mail_action INTO _default_action
    FROM public.tenants WHERE id = NEW.tenant_id;
  END IF;

  -- Apply the default action if it's set
  IF _default_action IS NOT NULL AND _default_action <> '' THEN
    NEW.chosen_action := _default_action;
    NEW.status := 'afventer_handling';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT: apply default action when mail item is created with a tenant
CREATE TRIGGER apply_default_action_on_insert
  BEFORE INSERT ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_tenant_default_action();

-- Trigger on UPDATE: apply default action when tenant is assigned to existing mail item
CREATE TRIGGER apply_default_action_on_tenant_assign
  BEFORE UPDATE ON public.mail_items
  FOR EACH ROW
  WHEN (OLD.tenant_id IS DISTINCT FROM NEW.tenant_id AND NEW.tenant_id IS NOT NULL AND NEW.chosen_action IS NULL)
  EXECUTE FUNCTION public.apply_tenant_default_action();
