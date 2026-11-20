CREATE TABLE public.sms_preferences (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 phone_number text,
 prompted_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sms_phone_format CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{7,14}$'),
 CONSTRAINT sms_enabled_number CHECK (NOT enabled OR phone_number IS NOT NULL)
);
GRANT SELECT,INSERT,UPDATE ON public.sms_preferences TO authenticated;
GRANT ALL ON public.sms_preferences TO service_role;
ALTER TABLE public.sms_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own SMS choice" ON public.sms_preferences FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "Users insert own SMS choice" ON public.sms_preferences FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "Users update own SMS choice" ON public.sms_preferences FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE TABLE public.new_mail_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 mail_item_ids uuid[] NOT NULL DEFAULT '{}', due_at timestamptz NOT NULL DEFAULT now()+interval '2 minutes',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
 locked_at timestamptz, error_message text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.new_mail_batches TO authenticated;
GRANT ALL ON public.new_mail_batches TO service_role;
ALTER TABLE public.new_mail_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read notification batches" ON public.new_mail_batches FOR SELECT TO authenticated USING(public.is_operator());
CREATE UNIQUE INDEX one_pending_mail_batch ON public.new_mail_batches(tenant_id) WHERE status='pending';
CREATE TABLE public.new_mail_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES public.new_mail_batches(id),
 channel text NOT NULL CHECK(channel IN ('email','sms')), recipient text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','skipped')),
 provider_id text, error_message text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,channel,recipient)
);
GRANT SELECT ON public.new_mail_deliveries TO authenticated;
GRANT ALL ON public.new_mail_deliveries TO service_role;
ALTER TABLE public.new_mail_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read notification deliveries" ON public.new_mail_deliveries FOR SELECT TO authenticated USING(public.is_operator());
CREATE OR REPLACE FUNCTION public.notify_tenant_on_mail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.new_mail_batches; u uuid; detail text; amount integer;
BEGIN
 IF NEW.tenant_id IS NULL OR (TG_OP='UPDATE' AND OLD.tenant_id IS NOT NULL) THEN RETURN NEW; END IF;
 INSERT INTO public.new_mail_batches(tenant_id,mail_item_ids) VALUES(NEW.tenant_id,ARRAY[NEW.id])
 ON CONFLICT(tenant_id) WHERE status='pending' DO UPDATE SET mail_item_ids=array_append(new_mail_batches.mail_item_ids,NEW.id),due_at=now()+interval '2 minutes' RETURNING * INTO b;
 SELECT count(*),string_agg(CASE WHEN mail_type='pakke' THEN 'Pakke' ELSE 'Brev' END || COALESCE(' #'||stamp_number::text,' uden nr.') || ' — '||COALESCE(sender_name,'Ukendt afsender'), E'\n' ORDER BY created_at)
 INTO amount,detail FROM public.mail_items WHERE id=ANY(b.mail_item_ids);
 FOR u IN SELECT user_id FROM public.tenants WHERE id=NEW.tenant_id AND user_id IS NOT NULL UNION SELECT user_id FROM public.tenant_users WHERE tenant_id=NEW.tenant_id LOOP
   UPDATE public.notifications SET title=amount||' nye forsendelser modtaget',message=detail WHERE user_id=u AND mail_item_id=b.mail_item_ids[1];
   IF NOT FOUND THEN INSERT INTO public.notifications(user_id,mail_item_id,title,message) VALUES(u,b.mail_item_ids[1],amount||' nye forsendelser modtaget',detail); END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER on_mail_assigned_notify AFTER UPDATE OF tenant_id ON public.mail_items FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_on_mail();
CREATE OR REPLACE FUNCTION public.claim_new_mail_batches() RETURNS SETOF public.new_mail_batches LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.new_mail_batches SET status='processing',locked_at=now() WHERE id IN (SELECT id FROM public.new_mail_batches WHERE (status='pending' AND due_at<=now()) OR (status='processing' AND locked_at<now()-interval '5 minutes') ORDER BY due_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_new_mail_batches() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_new_mail_batches() TO service_role;