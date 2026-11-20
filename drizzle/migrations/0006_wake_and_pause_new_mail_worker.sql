CREATE OR REPLACE FUNCTION public.wake_new_mail_worker() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(91286741);
 PERFORM cron.alter_job(85,active:=true);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wake_new_mail_worker() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wake_new_mail_worker AFTER INSERT OR UPDATE OF due_at ON public.new_mail_batches FOR EACH ROW EXECUTE FUNCTION public.wake_new_mail_worker();
CREATE OR REPLACE FUNCTION public.pause_idle_new_mail_worker() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(91286741);
 IF NOT EXISTS(SELECT 1 FROM public.new_mail_batches WHERE status IN ('pending','processing')) THEN PERFORM cron.alter_job(85,active:=false); END IF;
END $$;
REVOKE ALL ON FUNCTION public.pause_idle_new_mail_worker() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pause_idle_new_mail_worker() TO service_role;