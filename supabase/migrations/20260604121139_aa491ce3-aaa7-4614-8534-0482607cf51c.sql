DROP POLICY IF EXISTS "Tenants update own mail action" ON public.mail_items;

CREATE POLICY "Tenants update own mail action"
ON public.mail_items
FOR UPDATE
TO authenticated
USING (tenant_id IN (SELECT public.my_tenant_ids()))
WITH CHECK (
  tenant_id IN (SELECT public.my_tenant_ids())
  AND tenant_id      = (SELECT tenant_id      FROM public.mail_items m WHERE m.id = mail_items.id)
  AND status         = (SELECT status         FROM public.mail_items m WHERE m.id = mail_items.id)
  AND operator_id    = (SELECT operator_id    FROM public.mail_items m WHERE m.id = mail_items.id)
  AND mail_type      = (SELECT mail_type      FROM public.mail_items m WHERE m.id = mail_items.id)
  AND sender_name   IS NOT DISTINCT FROM (SELECT sender_name      FROM public.mail_items m WHERE m.id = mail_items.id)
  AND photo_url     IS NOT DISTINCT FROM (SELECT photo_url        FROM public.mail_items m WHERE m.id = mail_items.id)
  AND scan_url      IS NOT DISTINCT FROM (SELECT scan_url         FROM public.mail_items m WHERE m.id = mail_items.id)
  AND tracking_number IS NOT DISTINCT FROM (SELECT tracking_number FROM public.mail_items m WHERE m.id = mail_items.id)
  AND stamp_number  IS NOT DISTINCT FROM (SELECT stamp_number     FROM public.mail_items m WHERE m.id = mail_items.id)
  AND porto_option  IS NOT DISTINCT FROM (SELECT porto_option     FROM public.mail_items m WHERE m.id = mail_items.id)
  AND is_registered  = (SELECT is_registered  FROM public.mail_items m WHERE m.id = mail_items.id)
  AND received_at    = (SELECT received_at    FROM public.mail_items m WHERE m.id = mail_items.id)
  AND scanned_at    IS NOT DISTINCT FROM (SELECT scanned_at       FROM public.mail_items m WHERE m.id = mail_items.id)
);