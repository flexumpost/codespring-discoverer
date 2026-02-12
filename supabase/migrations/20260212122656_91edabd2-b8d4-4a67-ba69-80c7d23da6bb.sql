
-- 1. App role enum
CREATE TYPE public.app_role AS ENUM ('operator', 'tenant');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Tenant types
CREATE TABLE public.tenant_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_types ENABLE ROW LEVEL SECURITY;

-- 5. Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_type_id UUID NOT NULL REFERENCES public.tenant_types(id),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 6. Mail item status enum
CREATE TYPE public.mail_status AS ENUM ('ny', 'afventer_handling', 'ulaest', 'laest', 'arkiveret');
CREATE TYPE public.mail_type AS ENUM ('brev', 'pakke');

-- 7. Mail items
CREATE TABLE public.mail_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  stamp_number INTEGER,
  mail_type mail_type NOT NULL DEFAULT 'brev',
  sender_name TEXT,
  status mail_status NOT NULL DEFAULT 'ny',
  chosen_action TEXT,
  photo_url TEXT,
  notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mail_items ENABLE ROW LEVEL SECURITY;

-- 8. Helper function: has_role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 9. Helper: is_operator shorthand
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'operator')
$$;

-- 10. Helper: get tenant IDs for current user
CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid()
$$;

-- 11. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mail_items_updated_at BEFORE UPDATE ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 12. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === RLS POLICIES ===

-- Profiles: anyone authenticated can read all (needed for operator to see names)
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: operators see all, users see own
CREATE POLICY "Read own or operator reads all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_operator());
-- Only operators can insert roles (no self-assignment to operator)
CREATE POLICY "Operators can manage roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());
CREATE POLICY "Operators can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_operator());

-- Tenant types: all authenticated can read
CREATE POLICY "Authenticated can read tenant types" ON public.tenant_types
  FOR SELECT TO authenticated USING (true);
-- Only operators can manage tenant types
CREATE POLICY "Operators manage tenant types" ON public.tenant_types
  FOR ALL TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

-- Tenants: operators see all, tenants see own
CREATE POLICY "Read tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_operator() OR user_id = auth.uid());
CREATE POLICY "Operators insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());
CREATE POLICY "Operators update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_operator());
CREATE POLICY "Operators delete tenants" ON public.tenants
  FOR DELETE TO authenticated
  USING (public.is_operator());

-- Mail items: operators see all, tenants see own
CREATE POLICY "Read mail items" ON public.mail_items
  FOR SELECT TO authenticated
  USING (public.is_operator() OR tenant_id IN (SELECT public.my_tenant_ids()));
CREATE POLICY "Operators insert mail" ON public.mail_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());
CREATE POLICY "Operators update mail" ON public.mail_items
  FOR UPDATE TO authenticated
  USING (public.is_operator());
-- Tenants can update their own mail (to choose action)
CREATE POLICY "Tenants update own mail action" ON public.mail_items
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.my_tenant_ids()));
CREATE POLICY "Operators delete mail" ON public.mail_items
  FOR DELETE TO authenticated
  USING (public.is_operator());

-- 13. Seed tenant types
INSERT INTO public.tenant_types (name, allowed_actions, description) VALUES
  ('Lite', '["opbevar", "destruer"]', 'Basis-pakke med opbevaring og destruktion'),
  ('Standard', '["videresend", "scan", "opbevar", "destruer"]', 'Standardpakke med videresendelse og scanning'),
  ('Plus', '["videresend", "scan", "opbevar", "destruer", "prioritet"]', 'Udvidet pakke med prioriteret håndtering'),
  ('Fastlejer', '["videresend", "scan", "opbevar", "destruer", "prioritet", "daglig"]', 'Fastlejer med daglig posthåndtering'),
  ('Nabo', '["opbevar"]', 'Nabo — kun opbevaring'),
  ('Retur til afsender', '["retur"]', 'Returneres automatisk til afsender');
