
-- ============================================================
-- Stage 1b: Reference data, kiosk devices, products, store products
-- ============================================================

-- ---------- Enums ----------
CREATE TYPE public.formulation_type AS ENUM (
  'tablet',
  'capsule',
  'oral_liquid',
  'nasal_spray',
  'nasal_drops',
  'eye_drops',
  'cream',
  'ointment',
  'lozenge',
  'powder',
  'other'
);

CREATE TYPE public.drowsiness_level AS ENUM ('none', 'low', 'moderate', 'high');

CREATE TYPE public.stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'ask_staff');

CREATE TYPE public.kiosk_status AS ENUM ('active', 'suspended', 'retired');

-- ---------- kiosk_devices ----------
-- Trusted store-binding record. Each physical/browser kiosk is registered by
-- staff and receives an opaque device token. Anonymous session creation must
-- present a valid device token; the server derives store_id from this row,
-- not from a client-submitted storeId.
CREATE TABLE public.kiosk_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  label text NOT NULL,
  device_token_hash text NOT NULL UNIQUE, -- sha256 of the opaque device token
  status public.kiosk_status NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kiosk_store ON public.kiosk_devices(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_devices TO authenticated;
GRANT ALL ON public.kiosk_devices TO service_role;
ALTER TABLE public.kiosk_devices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_kiosk_updated
  BEFORE UPDATE ON public.kiosk_devices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "kiosk_read_store_members" ON public.kiosk_devices
  FOR SELECT TO authenticated
  USING (public.has_store_membership(auth.uid(), store_id));
CREATE POLICY "kiosk_manage_store_managers" ON public.kiosk_devices
  FOR ALL TO authenticated
  USING (
    public.has_store_role(auth.uid(), store_id, 'store_manager')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.has_store_role(auth.uid(), store_id, 'store_manager')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.is_platform_admin(auth.uid())
  );

-- ---------- symptoms (global reference data) ----------
CREATE TABLE public.symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  customer_description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Symptoms are non-commercial global labels; anon read is acceptable.
GRANT SELECT ON public.symptoms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptoms TO authenticated;
GRANT ALL ON public.symptoms TO service_role;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_symptoms_updated
  BEFORE UPDATE ON public.symptoms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "symptoms_public_read_active" ON public.symptoms
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "symptoms_auth_read" ON public.symptoms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "symptoms_admin_write" ON public.symptoms
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ---------- customer_display_groups ----------
-- Customer-facing display buckets (Tablets / Nasal sprays / Eye drops).
-- This is NOT the canonical taxonomy — it is what the tablet UI shows.
CREATE TABLE public.customer_display_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  customer_description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_display_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_display_groups TO authenticated;
GRANT ALL ON public.customer_display_groups TO service_role;
ALTER TABLE public.customer_display_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cdg_updated
  BEFORE UPDATE ON public.customer_display_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "cdg_public_read_active" ON public.customer_display_groups
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "cdg_auth_read" ON public.customer_display_groups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cdg_admin_write" ON public.customer_display_groups
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ---------- treatment_groups ----------
-- Clinical/mechanistic grouping (e.g. antihistamine, intranasal corticosteroid).
CREATE TABLE public.treatment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_groups TO authenticated;
GRANT ALL ON public.treatment_groups TO service_role;
ALTER TABLE public.treatment_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_treatment_updated
  BEFORE UPDATE ON public.treatment_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "treatment_auth_read" ON public.treatment_groups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "treatment_admin_write" ON public.treatment_groups
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ---------- symptom_display_group_mappings ----------
CREATE TABLE public.symptom_display_group_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id uuid NOT NULL REFERENCES public.symptoms(id) ON DELETE CASCADE,
  display_group_id uuid NOT NULL REFERENCES public.customer_display_groups(id) ON DELETE CASCADE,
  relevance_weight integer NOT NULL DEFAULT 1 CHECK (relevance_weight BETWEEN 0 AND 10),
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symptom_id, display_group_id)
);
CREATE INDEX idx_sdgm_symptom ON public.symptom_display_group_mappings(symptom_id);
CREATE INDEX idx_sdgm_group ON public.symptom_display_group_mappings(display_group_id);
GRANT SELECT ON public.symptom_display_group_mappings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptom_display_group_mappings TO authenticated;
GRANT ALL ON public.symptom_display_group_mappings TO service_role;
ALTER TABLE public.symptom_display_group_mappings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sdgm_updated
  BEFORE UPDATE ON public.symptom_display_group_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "sdgm_public_read_active" ON public.symptom_display_group_mappings
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "sdgm_auth_read" ON public.symptom_display_group_mappings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sdgm_admin_write" ON public.symptom_display_group_mappings
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ---------- products (canonical) ----------
-- No prices, no stock, no shelves here. Those live in store_products.
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin text,
  product_name text NOT NULL,
  brand_name text,
  active_ingredient text NOT NULL,
  strength text,
  formulation public.formulation_type NOT NULL,
  pack_size text NOT NULL,
  customer_summary text,
  treatment_group_id uuid REFERENCES public.treatment_groups(id) ON DELETE SET NULL,
  drowsiness_level public.drowsiness_level NOT NULL DEFAULT 'none',
  requires_staff_help boolean NOT NULL DEFAULT false,
  warning_text text,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_active ON public.products(active);
CREATE INDEX idx_products_formulation ON public.products(formulation);
CREATE INDEX idx_products_gtin ON public.products(gtin) WHERE gtin IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
-- NO anon grant: customers reach products only through server-function projections.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "products_auth_read" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_editor_write" ON public.products
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.staff_profiles sp ON sp.id = om.staff_profile_id
      WHERE sp.auth_user_id = auth.uid()
        AND om.role IN ('catalogue_editor', 'catalogue_approver')
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.staff_profiles sp ON sp.id = om.staff_profile_id
      WHERE sp.auth_user_id = auth.uid()
        AND om.role IN ('catalogue_editor', 'catalogue_approver')
        AND om.status = 'active'
    )
  );

-- ---------- product_display_group_mappings ----------
CREATE TABLE public.product_display_group_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_group_id uuid NOT NULL REFERENCES public.customer_display_groups(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, display_group_id)
);
CREATE INDEX idx_pdgm_product ON public.product_display_group_mappings(product_id);
CREATE INDEX idx_pdgm_group ON public.product_display_group_mappings(display_group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_display_group_mappings TO authenticated;
GRANT ALL ON public.product_display_group_mappings TO service_role;
ALTER TABLE public.product_display_group_mappings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pdgm_updated
  BEFORE UPDATE ON public.product_display_group_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "pdgm_auth_read" ON public.product_display_group_mappings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pdgm_editor_write" ON public.product_display_group_mappings
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.staff_profiles sp ON sp.id = om.staff_profile_id
      WHERE sp.auth_user_id = auth.uid()
        AND om.role IN ('catalogue_editor', 'catalogue_approver')
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.staff_profiles sp ON sp.id = om.staff_profile_id
      WHERE sp.auth_user_id = auth.uid()
        AND om.role IN ('catalogue_editor', 'catalogue_approver')
        AND om.status = 'active'
    )
  );

-- ---------- store_products (per-store price / stock / shelf) ----------
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  retailer_sku text NOT NULL,
  retailer_product_name text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  promotional_price numeric(10,2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  currency char(3) NOT NULL DEFAULT 'GBP',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  stock_status public.stock_status NOT NULL DEFAULT 'in_stock',
  aisle text,
  bay text,
  shelf text,
  retailer_image_url text,
  available_for_display boolean NOT NULL DEFAULT true,
  data_last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, retailer_sku),
  UNIQUE (store_id, product_id)
);
CREATE INDEX idx_sp_store ON public.store_products(store_id);
CREATE INDEX idx_sp_product ON public.store_products(product_id);
CREATE INDEX idx_sp_display ON public.store_products(store_id, available_for_display);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
-- NO anon grant.
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sp_updated
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "sp_read_store_members" ON public.store_products
  FOR SELECT TO authenticated
  USING (public.has_store_membership(auth.uid(), store_id));
CREATE POLICY "sp_manage_store" ON public.store_products
  FOR ALL TO authenticated
  USING (
    public.has_store_role(auth.uid(), store_id, 'store_manager')
    OR EXISTS (
      SELECT 1 FROM public.stores st
      WHERE st.id = store_id
        AND (
          public.has_org_role(auth.uid(), st.organisation_id, 'catalogue_editor')
          OR public.has_org_role(auth.uid(), st.organisation_id, 'catalogue_approver')
        )
    )
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.has_store_role(auth.uid(), store_id, 'store_manager')
    OR EXISTS (
      SELECT 1 FROM public.stores st
      WHERE st.id = store_id
        AND (
          public.has_org_role(auth.uid(), st.organisation_id, 'catalogue_editor')
          OR public.has_org_role(auth.uid(), st.organisation_id, 'catalogue_approver')
        )
    )
    OR public.is_platform_admin(auth.uid())
  );
