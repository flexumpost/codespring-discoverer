
ALTER TABLE public.tenants ADD COLUMN shipping_recipient text;
ALTER TABLE public.tenants ADD COLUMN shipping_co text;
ALTER TABLE public.tenants ADD COLUMN shipping_address text;
ALTER TABLE public.tenants ADD COLUMN shipping_zip text;
ALTER TABLE public.tenants ADD COLUMN shipping_city text;
ALTER TABLE public.tenants ADD COLUMN shipping_state text;
ALTER TABLE public.tenants ADD COLUMN shipping_country text;

CREATE POLICY "Tenants update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
