
-- Table
CREATE TABLE public.mail_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_item_id uuid NOT NULL REFERENCES public.mail_items(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mail_item_logs ENABLE ROW LEVEL SECURITY;

-- RLS: operators read all, tenants read own
CREATE POLICY "Operators read all logs" ON public.mail_item_logs
  FOR SELECT TO authenticated
  USING (is_operator());

CREATE POLICY "Tenants read own logs" ON public.mail_item_logs
  FOR SELECT TO authenticated
  USING (
    mail_item_id IN (
      SELECT mi.id FROM public.mail_items mi WHERE mi.tenant_id IN (SELECT my_tenant_ids())
    )
  );

-- Allow trigger inserts (security definer functions insert)
CREATE POLICY "System inserts logs" ON public.mail_item_logs
  FOR INSERT TO public
  WITH CHECK (true);

-- Trigger function: log INSERT
CREATE OR REPLACE FUNCTION public.log_mail_item_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, new_value)
  VALUES (NEW.id, auth.uid(), 'created', NEW.status::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mail_item_created
  AFTER INSERT ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION public.log_mail_item_created();

-- Trigger function: log UPDATE changes
CREATE OR REPLACE FUNCTION public.log_mail_item_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
  END IF;

  IF OLD.chosen_action IS DISTINCT FROM NEW.chosen_action THEN
    INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(),
      CASE WHEN NEW.chosen_action IS NULL THEN 'action_cleared' ELSE 'action_chosen' END,
      OLD.chosen_action, NEW.chosen_action);
  END IF;

  IF OLD.scan_url IS DISTINCT FROM NEW.scan_url AND NEW.scan_url IS NOT NULL THEN
    INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, new_value)
    VALUES (NEW.id, auth.uid(), 'scan_uploaded', NEW.scan_url);
  END IF;

  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'tenant_assigned', OLD.tenant_id::text, NEW.tenant_id::text);
  END IF;

  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO public.mail_item_logs (mail_item_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'notes_changed', OLD.notes, NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mail_item_changes
  AFTER UPDATE ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION public.log_mail_item_changes();
