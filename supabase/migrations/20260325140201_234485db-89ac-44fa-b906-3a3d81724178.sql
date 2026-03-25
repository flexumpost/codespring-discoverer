
-- 1. Create officernd_sync_log table
CREATE TABLE public.officernd_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_item_id uuid NOT NULL REFERENCES public.mail_items(id) ON DELETE CASCADE,
  charge_id text,
  amount_text text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.officernd_sync_log ENABLE ROW LEVEL SECURITY;

-- Only operators can read sync logs
CREATE POLICY "Operators read sync logs"
  ON public.officernd_sync_log FOR SELECT
  TO authenticated
  USING (public.is_operator());

-- Service role can manage sync logs (edge function uses service role)
CREATE POLICY "Service role manages sync logs"
  ON public.officernd_sync_log FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Create officernd_settings table for toggle/config
CREATE TABLE public.officernd_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  org_slug text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.officernd_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage officernd_settings"
  ON public.officernd_settings FOR ALL
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

-- Insert default row
INSERT INTO public.officernd_settings (id, enabled) VALUES (1, false);

-- 3. Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 4. Create trigger function that calls edge function on archive
CREATE OR REPLACE FUNCTION public.notify_officernd_on_archive()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _settings record;
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Only fire when status changes TO arkiveret
  IF NEW.status <> 'arkiveret' THEN RETURN NEW; END IF;
  IF OLD.status = 'arkiveret' THEN RETURN NEW; END IF;

  -- Check if integration is enabled
  SELECT enabled INTO _settings FROM public.officernd_settings WHERE id = 1;
  IF NOT FOUND OR NOT _settings.enabled THEN RETURN NEW; END IF;

  -- Get config from vault/env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- Call edge function via pg_net
  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/sync-officernd-charge',
    body := jsonb_build_object('mail_item_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )
  );

  RETURN NEW;
END;
$function$;

-- 5. Create trigger on mail_items
CREATE TRIGGER on_mail_item_archived
  AFTER UPDATE ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_officernd_on_archive();
