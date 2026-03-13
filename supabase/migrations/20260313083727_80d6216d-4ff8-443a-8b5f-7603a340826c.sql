
-- 1. Create tenant_users table
CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- RLS: Tenants can see their own rows, operators can see all
CREATE POLICY "Users read own tenant_users"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_operator());

CREATE POLICY "Operators manage tenant_users"
  ON public.tenant_users FOR ALL TO authenticated
  USING (is_operator())
  WITH CHECK (is_operator());

-- Allow tenant owners to insert (for creating new recipients)
CREATE POLICY "Tenant owners insert tenant_users"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR is_operator()
  );

-- 2. Update my_tenant_ids() to include tenant_users
CREATE OR REPLACE FUNCTION public.my_tenant_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
$$;

-- 3. Update tenants READ RLS to include tenant_users
DROP POLICY IF EXISTS "Read tenants" ON public.tenants;
CREATE POLICY "Read tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    is_operator()
    OR user_id = auth.uid()
    OR id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );
