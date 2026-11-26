ALTER TABLE public.new_mail_batches
 ADD COLUMN kind text NOT NULL DEFAULT 'new_mail';
ALTER TABLE public.new_mail_batches
 ADD CONSTRAINT new_mail_batches_kind_check CHECK (kind IN ('new_mail','scan_ready'));
DROP INDEX public.one_pending_mail_batch;
CREATE UNIQUE INDEX one_pending_mail_batch ON public.new_mail_batches(tenant_id,kind) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.notify_tenant_on_mail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.new_mail_batches; u uuid; detail text; amount integer;
BEGIN
 IF NEW.tenant_id IS NULL OR (TG_OP='UPDATE' AND OLD.tenant_id IS NOT NULL) THEN RETURN NEW; END IF;
 INSERT INTO public.new_mail_batches(tenant_id,mail_item_ids,kind) VALUES(NEW.tenant_id,ARRAY[NEW.id],'new_mail')
 ON CONFLICT(tenant_id,kind) WHERE status='pending' DO UPDATE SET mail_item_ids=array_append(new_mail_batches.mail_item_ids,NEW.id),due_at=now()+interval '2 minutes' RETURNING * INTO b;
 SELECT count(*),string_agg(CASE WHEN mail_type='pakke' THEN 'Pakke' ELSE 'Brev' END || COALESCE(' #'||stamp_number::text,' uden nr.') || ' — '||COALESCE(sender_name,'Ukendt afsender'), E'\n' ORDER BY created_at)
 INTO amount,detail FROM public.mail_items WHERE id=ANY(b.mail_item_ids);
 FOR u IN SELECT user_id FROM public.tenants WHERE id=NEW.tenant_id AND user_id IS NOT NULL UNION SELECT user_id FROM public.tenant_users WHERE tenant_id=NEW.tenant_id LOOP
   UPDATE public.notifications SET title=amount||' nye forsendelser modtaget',message=detail WHERE user_id=u AND mail_item_id=b.mail_item_ids[1];
   IF NOT FOUND THEN INSERT INTO public.notifications(user_id,mail_item_id,title,message) VALUES(u,b.mail_item_ids[1],amount||' nye forsendelser modtaget',detail); END IF;
 END LOOP;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_tenant_on_scan() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF OLD.scan_url IS NOT NULL OR NEW.scan_url IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.status := 'ulaest';

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
      'Scanning klar',
      'Din forsendelse' ||
      CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END ||
      ' er blevet scannet og er klar til download.'
    );
  END IF;

  IF NEW.mail_type = 'brev' THEN
    INSERT INTO public.new_mail_batches(tenant_id,mail_item_ids,kind,due_at)
    VALUES(NEW.tenant_id,ARRAY[NEW.id],'scan_ready',now())
    ON CONFLICT(tenant_id,kind) WHERE status='pending' DO UPDATE SET
      mail_item_ids=CASE
        WHEN NEW.id=ANY(new_mail_batches.mail_item_ids) THEN new_mail_batches.mail_item_ids
        ELSE array_append(new_mail_batches.mail_item_ids,NEW.id)
      END;
  END IF;

  RETURN NEW;
END $$;