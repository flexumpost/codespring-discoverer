ALTER TABLE public.returned_letters ADD COLUMN mail_item_ids uuid[] NOT NULL DEFAULT '{}', ADD COLUMN shipment_numbers integer[] NOT NULL DEFAULT '{}', ADD COLUMN shipment_snapshot jsonb NOT NULL DEFAULT '[]';
CREATE OR REPLACE FUNCTION public.prepare_returned_shipments() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE matched integer;
BEGIN
 PERFORM 1 FROM public.tenants WHERE id=NEW.tenant_id FOR UPDATE;
 IF TG_OP='UPDATE' THEN
  IF NEW.mail_item_ids IS DISTINCT FROM OLD.mail_item_ids OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN RAISE EXCEPTION 'Returbrevets forsendelser kan ikke ændres.'; END IF;
  RETURN NEW;
 END IF;
 IF cardinality(NEW.mail_item_ids)=0 THEN RETURN NEW; END IF;
 SELECT count(*), array_agg(m.stamp_number ORDER BY m.stamp_number), jsonb_agg(jsonb_build_object('id',m.id,'stamp_number',m.stamp_number,'status',m.status,'sent_at',m.updated_at,'tracking_number',m.tracking_number) ORDER BY m.stamp_number)
 INTO matched, NEW.shipment_numbers, NEW.shipment_snapshot FROM public.mail_items m WHERE m.id=ANY(NEW.mail_item_ids) AND m.tenant_id=NEW.tenant_id AND m.mail_type='brev' AND m.status IN ('sendt_med_dao','sendt_med_postnord');
 IF matched<>cardinality(NEW.mail_item_ids) THEN RAISE EXCEPTION 'Alle numre skal være sendte breve til den valgte lejer.'; END IF;
 IF EXISTS (SELECT 1 FROM public.returned_letters r WHERE r.mail_item_ids && NEW.mail_item_ids AND r.status<>'resent') THEN RAISE EXCEPTION 'Et af brevene er allerede registreret retur.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepare_returned_shipments BEFORE INSERT OR UPDATE ON public.returned_letters FOR EACH ROW EXECUTE FUNCTION public.prepare_returned_shipments();
CREATE OR REPLACE FUNCTION public.guard_returned_letter_dispatch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.mail_type='brev' AND NEW.status IN ('sendt_med_dao','sendt_med_postnord') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  PERFORM 1 FROM public.tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.returned_letters r WHERE r.tenant_id=NEW.tenant_id AND r.status IN ('draft','notified','declined')) THEN RAISE EXCEPTION 'Brevforsendelser er sat på pause, indtil lejeren godkender genforsendelse af returbrevene.'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_returned_letter_dispatch BEFORE INSERT OR UPDATE ON public.mail_items FOR EACH ROW EXECUTE FUNCTION public.guard_returned_letter_dispatch();
CREATE OR REPLACE FUNCTION public.requeue_approved_returned_letters() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous_setting text;
BEGIN
 IF NEW.status='resend_requested' AND OLD.status='notified' THEN
  previous_setting := current_setting('app.restore_archive',true);
  PERFORM set_config('app.restore_archive','on',true);
  UPDATE public.mail_items SET status='afventer_handling', chosen_action='standard_forsendelse', tracking_number=NULL WHERE id=ANY(NEW.mail_item_ids) AND tenant_id=NEW.tenant_id;
  PERFORM set_config('app.restore_archive',coalesce(previous_setting,''),true);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER requeue_approved_returned_letters AFTER UPDATE ON public.returned_letters FOR EACH ROW EXECUTE FUNCTION public.requeue_approved_returned_letters();
CREATE OR REPLACE FUNCTION public.complete_returned_letter_dispatch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('sendt_med_dao','sendt_med_postnord') AND OLD.status IS DISTINCT FROM NEW.status THEN
  UPDATE public.returned_letters r SET status='resent' WHERE r.status='resend_requested' AND NEW.id=ANY(r.mail_item_ids) AND NOT EXISTS (SELECT 1 FROM public.mail_items m WHERE m.id=ANY(r.mail_item_ids) AND m.status NOT IN ('sendt_med_dao','sendt_med_postnord'));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER complete_returned_letter_dispatch AFTER UPDATE ON public.mail_items FOR EACH ROW EXECUTE FUNCTION public.complete_returned_letter_dispatch();