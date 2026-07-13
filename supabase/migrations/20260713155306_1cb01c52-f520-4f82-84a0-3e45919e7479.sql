
-- ============================================================
-- Stage 1a: Core organisational model, staff, memberships, helpers
-- ============================================================

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- Enums ----------
CREATE TYPE public.app_role AS ENUM (
  'platform_admin',
  'catalogue_approver',
  'catalogue_editor',
  'store_manager',
  'pharmacy_staff'
);

CREATE TYPE public.entity_status AS ENUM ('active', 'inactive', 'archived');

-- ---------- organisations ----------
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_organisations_updated
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- stores ----------
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  store_code text NOT NULL,
  address text,
  timezone text NOT NULL DEFAULT 'Europe/London',
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, store_code)
);
CREATE INDEX idx_stores_org ON public.stores(organisation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- staff_profiles ----------
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE, -- references auth.users.id, no FK per Supabase guidance
  full_name text NOT NULL,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_staff_profiles_updated
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- organisation_memberships ----------
CREATE TABLE public.organisation_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_profile_id, organisation_id, role)
);
CREATE INDEX idx_org_mem_staff ON public.organisation_memberships(staff_profile_id);
CREATE INDEX idx_org_mem_org ON public.organisation_memberships(organisation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_memberships TO authenticated;
GRANT ALL ON public.organisation_memberships TO service_role;
ALTER TABLE public.organisation_memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_mem_updated
  BEFORE UPDATE ON public.organisation_memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- store_memberships ----------
CREATE TABLE public.store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_profile_id, store_id, role)
);
CREATE INDEX idx_store_mem_staff ON public.store_memberships(staff_profile_id);
CREATE INDEX idx_store_mem_store ON public.store_memberships(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_memberships TO authenticated;
GRANT ALL ON public.store_memberships TO service_role;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_store_mem_updated
  BEFORE UPDATE ON public.store_memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- Security-definer helpers (avoid recursive RLS) ----------
CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.staff_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = _user
      AND om.role = 'platform_admin'
      AND om.status = 'active'
      AND sp.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user uuid, _org uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = _user
      AND om.organisation_id = _org
      AND om.role = _role
      AND om.status = 'active'
      AND sp.status = 'active'
  ) OR public.is_platform_admin(_user);
$$;

CREATE OR REPLACE FUNCTION public.has_org_membership(_user uuid, _org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = _user
      AND om.organisation_id = _org
      AND om.status = 'active'
      AND sp.status = 'active'
  ) OR public.is_platform_admin(_user);
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_user uuid, _store uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.store_memberships sm ON sm.staff_profile_id = sp.id
    WHERE sp.auth_user_id = _user
      AND sm.store_id = _store
      AND sm.role = _role
      AND sm.status = 'active'
      AND sp.status = 'active'
  ) OR EXISTS (
    -- Org-level roles implicitly cover their stores
    SELECT 1
    FROM public.stores st
    JOIN public.staff_profiles sp ON sp.auth_user_id = _user
    JOIN public.organisation_memberships om
      ON om.staff_profile_id = sp.id
     AND om.organisation_id = st.organisation_id
     AND om.role = _role
     AND om.status = 'active'
    WHERE st.id = _store
      AND sp.status = 'active'
  ) OR public.is_platform_admin(_user);
$$;

CREATE OR REPLACE FUNCTION public.has_store_membership(_user uuid, _store uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.store_memberships sm ON sm.staff_profile_id = sp.id
    WHERE sp.auth_user_id = _user
      AND sm.store_id = _store
      AND sm.status = 'active'
      AND sp.status = 'active'
  ) OR EXISTS (
    SELECT 1
    FROM public.stores st
    WHERE st.id = _store
      AND public.has_org_membership(_user, st.organisation_id)
  ) OR public.is_platform_admin(_user);
$$;

-- ---------- Policies ----------

-- organisations: any org member (or platform admin) can read; only platform admin writes
CREATE POLICY "org_select_members" ON public.organisations
  FOR SELECT TO authenticated
  USING (public.has_org_membership(auth.uid(), id));

CREATE POLICY "org_admin_all" ON public.organisations
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- stores: any org member can read; store manager or org catalogue_editor/approver/platform_admin can write
CREATE POLICY "stores_select_members" ON public.stores
  FOR SELECT TO authenticated
  USING (public.has_org_membership(auth.uid(), organisation_id));

CREATE POLICY "stores_write_managers" ON public.stores
  FOR ALL TO authenticated
  USING (
    public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.has_store_role(auth.uid(), id, 'store_manager')
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.has_store_role(auth.uid(), id, 'store_manager')
    OR public.is_platform_admin(auth.uid())
  );

-- staff_profiles: users can read own profile; platform admin can read all
CREATE POLICY "staff_own_select" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "staff_own_update" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "staff_admin_all" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- organisation_memberships: user sees own memberships; platform admin all
CREATE POLICY "orgmem_own_select" ON public.organisation_memberships
  FOR SELECT TO authenticated
  USING (
    staff_profile_id = public.current_staff_profile_id()
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "orgmem_admin_all" ON public.organisation_memberships
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- store_memberships: user sees own memberships; store manager sees memberships in own stores; platform admin all
CREATE POLICY "storemem_own_select" ON public.store_memberships
  FOR SELECT TO authenticated
  USING (
    staff_profile_id = public.current_staff_profile_id()
    OR public.has_store_role(auth.uid(), store_id, 'store_manager')
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "storemem_admin_all" ON public.store_memberships
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));
