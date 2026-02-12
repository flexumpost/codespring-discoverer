
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mail_item_id uuid REFERENCES public.mail_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.notify_tenant_on_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _user_id
  FROM tenants WHERE id = NEW.tenant_id;

  IF _user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (
      _user_id,
      NEW.id,
      'Ny ' || CASE WHEN NEW.mail_type = 'pakke' THEN 'pakke' ELSE 'forsendelse' END || ' modtaget',
      'Der er registreret en ny ' || CASE WHEN NEW.mail_type = 'pakke' THEN 'pakke' ELSE 'forsendelse' END ||
      CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END || '.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mail_item_created_notify
  AFTER INSERT ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tenant_on_mail();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
