
CREATE OR REPLACE FUNCTION public.mail_item_operator_fields_unchanged(
  _id uuid,
  _status text,
  _operator_id uuid,
  _mail_type text,
  _sender_name text,
  _photo_url text,
  _scan_url text,
  _tracking_number text,
  _stamp_number integer,
  _porto_option text,
  _is_registered boolean,
  _received_at timestamptz,
  _scanned_at timestamptz,
  _tenant_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mail_items m
    WHERE m.id = _id
      AND m.tenant_id     IS NOT DISTINCT FROM _tenant_id
      AND m.status::text  IS NOT DISTINCT FROM _status
      AND m.operator_id   IS NOT DISTINCT FROM _operator_id
      AND m.mail_type::text IS NOT DISTINCT FROM _mail_type
      AND m.sender_name   IS NOT DISTINCT FROM _sender_name
      AND m.photo_url     IS NOT DISTINCT FROM _photo_url
      AND m.scan_url      IS NOT DISTINCT FROM _scan_url
      AND m.tracking_number IS NOT DISTINCT FROM _tracking_number
      AND m.stamp_number  IS NOT DISTINCT FROM _stamp_number
      AND m.porto_option  IS NOT DISTINCT FROM _porto_option
      AND m.is_registered IS NOT DISTINCT FROM _is_registered
      AND m.received_at   IS NOT DISTINCT FROM _received_at
      AND m.scanned_at    IS NOT DISTINCT FROM _scanned_at
  )
$$;

DROP POLICY IF EXISTS "Tenants update own mail action" ON public.mail_items;
CREATE POLICY "Tenants update own mail action"
ON public.mail_items
FOR UPDATE
USING (tenant_id IN (SELECT public.my_tenant_ids()))
WITH CHECK (
  tenant_id IN (SELECT public.my_tenant_ids())
  AND public.mail_item_operator_fields_unchanged(
    id, status::text, operator_id, mail_type::text, sender_name, photo_url, scan_url,
    tracking_number, stamp_number, porto_option, is_registered, received_at, scanned_at, tenant_id
  )
);

DROP POLICY IF EXISTS "Tenant owners delete tenant_users" ON public.tenant_users;
CREATE POLICY "Tenant owners delete tenant_users"
ON public.tenant_users
FOR DELETE
USING (
  tenant_id IN (SELECT public.owned_tenant_ids(auth.uid()))
  AND user_id <> auth.uid()
);
