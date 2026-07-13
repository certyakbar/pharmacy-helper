
-- ============================================================
-- Stage 1c: Catalogue versioning, imports, sessions, handovers, audit
-- ============================================================

CREATE TYPE public.catalogue_version_status AS ENUM (
  'draft',
  'approved',
  'superseded',
  'rolled_back'
);

CREATE TYPE public.catalogue_import_status AS ENUM (
  'uploaded',
  'validating',
  'validation_failed',
  'ready_for_review',
  'approved',
  'published',
  'rejected'
);

CREATE TYPE public.import_row_status AS ENUM ('valid', 'invalid', 'skipped_duplicate');

CREATE TYPE public.session_status AS ENUM (
  'active',
  'handover_requested',
  'completed',
  'expired'
);

CREATE TYPE public.shortlist_action AS ENUM ('viewed', 'compared', 'shortlisted', 'removed');

CREATE TYPE public.handover_status AS ENUM (
  'waiting',
  'opened',
  'completed',
  'expired',
  'cancelled'
);

-- ---------- catalogue_versions ----------
-- Immutable snapshots at the organisation level.
CREATE TABLE public.catalogue_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  status public.catalogue_version_status NOT NULL DEFAULT 'draft',
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  frozen_at timestamptz, -- set when status moves out of draft; contents become immutable
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, version_number)
);
CREATE INDEX idx_cv_org ON public.catalogue_versions(organisation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_versions TO authenticated;
GRANT ALL ON public.catalogue_versions TO service_role;
ALTER TABLE public.catalogue_versions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cv_updated
  BEFORE UPDATE ON public.catalogue_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "cv_read_org_members" ON public.catalogue_versions
  FOR SELECT TO authenticated
  USING (public.has_org_membership(auth.uid(), organisation_id));

CREATE POLICY "cv_editor_insert_update_draft" ON public.catalogue_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
     OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
     OR public.is_platform_admin(auth.uid()))
  );

CREATE POLICY "cv_editor_update_draft" ON public.catalogue_versions
  FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND (public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
         OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
         OR public.is_platform_admin(auth.uid()))
  )
  WITH CHECK (
    (public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
     OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
     OR public.is_platform_admin(auth.uid()))
  );

-- Immutability trigger: only draft versions may be edited, and only these
-- columns on approved/superseded versions may change: status transitions
-- managed by service-role publisher.
CREATE OR REPLACE FUNCTION public.tg_catalogue_version_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'draft' AND NEW.frozen_at IS NOT NULL THEN
    -- Allow only status transitions between approved/superseded/rolled_back
    IF (NEW.organisation_id, NEW.version_number, NEW.label, NEW.created_by, NEW.approved_by, NEW.approved_at, NEW.notes)
       IS DISTINCT FROM
       (OLD.organisation_id, OLD.version_number, OLD.label, OLD.created_by, OLD.approved_by, OLD.approved_at, OLD.notes)
    THEN
      RAISE EXCEPTION 'catalogue_versions is immutable after freeze (id=%)', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cv_immutable
  BEFORE UPDATE ON public.catalogue_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_catalogue_version_immutable();

-- ---------- catalogue_version_items ----------
-- Immutable snapshot rows for the version. Populated only while version is 'draft'.
CREATE TABLE public.catalogue_version_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_version_id uuid NOT NULL REFERENCES public.catalogue_versions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  retailer_sku text NOT NULL,
  retailer_product_name text,
  price numeric(10,2) NOT NULL,
  promotional_price numeric(10,2),
  currency char(3) NOT NULL DEFAULT 'GBP',
  stock_quantity integer NOT NULL DEFAULT 0,
  stock_status public.stock_status NOT NULL,
  aisle text,
  bay text,
  shelf text,
  retailer_image_url text,
  available_for_display boolean NOT NULL DEFAULT true,
  snapshot_data jsonb, -- full mapped row for audit
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_version_id, store_id, product_id)
);
CREATE INDEX idx_cvi_ver ON public.catalogue_version_items(catalogue_version_id);
CREATE INDEX idx_cvi_store ON public.catalogue_version_items(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_version_items TO authenticated;
GRANT ALL ON public.catalogue_version_items TO service_role;
ALTER TABLE public.catalogue_version_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cvi_read_org_members" ON public.catalogue_version_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.catalogue_versions cv
    WHERE cv.id = catalogue_version_id
      AND public.has_org_membership(auth.uid(), cv.organisation_id)
  ));

CREATE POLICY "cvi_editor_write_draft" ON public.catalogue_version_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.catalogue_versions cv
    WHERE cv.id = catalogue_version_id
      AND cv.status = 'draft'
      AND (public.has_org_role(auth.uid(), cv.organisation_id, 'catalogue_editor')
           OR public.has_org_role(auth.uid(), cv.organisation_id, 'catalogue_approver')
           OR public.is_platform_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.catalogue_versions cv
    WHERE cv.id = catalogue_version_id
      AND cv.status = 'draft'
      AND (public.has_org_role(auth.uid(), cv.organisation_id, 'catalogue_editor')
           OR public.has_org_role(auth.uid(), cv.organisation_id, 'catalogue_approver')
           OR public.is_platform_admin(auth.uid()))
  ));

-- ---------- catalogue_publications ----------
-- Points a store at a specific approved catalogue version. Insert-only history.
-- Product search resolves the *currently active* publication per store.
CREATE TABLE public.catalogue_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  catalogue_version_id uuid NOT NULL REFERENCES public.catalogue_versions(id) ON DELETE RESTRICT,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_rollback boolean NOT NULL DEFAULT false,
  superseded_at timestamptz,
  notes text
);
CREATE INDEX idx_cp_store_active ON public.catalogue_publications(store_id, superseded_at);
CREATE INDEX idx_cp_ver ON public.catalogue_publications(catalogue_version_id);
GRANT SELECT, INSERT, UPDATE ON public.catalogue_publications TO authenticated;
GRANT ALL ON public.catalogue_publications TO service_role;
ALTER TABLE public.catalogue_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_read_store_members" ON public.catalogue_publications
  FOR SELECT TO authenticated
  USING (public.has_store_membership(auth.uid(), store_id));

CREATE POLICY "cp_approver_insert" ON public.catalogue_publications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores st
    WHERE st.id = store_id
      AND (public.has_org_role(auth.uid(), st.organisation_id, 'catalogue_approver')
           OR public.is_platform_admin(auth.uid()))
  ));

-- ---------- catalogue_imports ----------
CREATE TABLE public.catalogue_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE, -- nullable: some imports are org-wide (products only)
  uploaded_by uuid,
  filename text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  file_hash text NOT NULL, -- sha256 of the raw file bytes
  idempotency_key text NOT NULL, -- caller-supplied to reject retries
  source_system text NOT NULL DEFAULT 'csv_upload',
  status public.catalogue_import_status NOT NULL DEFAULT 'uploaded',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  catalogue_version_id uuid REFERENCES public.catalogue_versions(id) ON DELETE SET NULL,
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, idempotency_key),
  UNIQUE (organisation_id, file_hash) -- reject duplicate uploads within an org
);
CREATE INDEX idx_ci_org ON public.catalogue_imports(organisation_id);
CREATE INDEX idx_ci_store ON public.catalogue_imports(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_imports TO authenticated;
GRANT ALL ON public.catalogue_imports TO service_role;
ALTER TABLE public.catalogue_imports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ci_updated
  BEFORE UPDATE ON public.catalogue_imports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "ci_read_org_members" ON public.catalogue_imports
  FOR SELECT TO authenticated
  USING (public.has_org_membership(auth.uid(), organisation_id));
CREATE POLICY "ci_editor_write" ON public.catalogue_imports
  FOR ALL TO authenticated
  USING (
    public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organisation_id, 'catalogue_editor')
    OR public.has_org_role(auth.uid(), organisation_id, 'catalogue_approver')
    OR public.is_platform_admin(auth.uid())
  );

-- ---------- catalogue_import_rows ----------
CREATE TABLE public.catalogue_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_import_id uuid NOT NULL REFERENCES public.catalogue_imports(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  source_product_id text, -- retailer's own SKU/product id, for traceability
  source_data jsonb NOT NULL,
  validation_status public.import_row_status NOT NULL,
  validation_errors jsonb,
  mapped_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_import_id, row_number)
);
CREATE INDEX idx_cir_import ON public.catalogue_import_rows(catalogue_import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_import_rows TO authenticated;
GRANT ALL ON public.catalogue_import_rows TO service_role;
ALTER TABLE public.catalogue_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cir_read_org_members" ON public.catalogue_import_rows
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.catalogue_imports ci
    WHERE ci.id = catalogue_import_id
      AND public.has_org_membership(auth.uid(), ci.organisation_id)
  ));
CREATE POLICY "cir_editor_write" ON public.catalogue_import_rows
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.catalogue_imports ci
    WHERE ci.id = catalogue_import_id
      AND (public.has_org_role(auth.uid(), ci.organisation_id, 'catalogue_editor')
           OR public.has_org_role(auth.uid(), ci.organisation_id, 'catalogue_approver')
           OR public.is_platform_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.catalogue_imports ci
    WHERE ci.id = catalogue_import_id
      AND (public.has_org_role(auth.uid(), ci.organisation_id, 'catalogue_editor')
           OR public.has_org_role(auth.uid(), ci.organisation_id, 'catalogue_approver')
           OR public.is_platform_admin(auth.uid()))
  ));

-- ---------- customer_sessions (anonymous, token-hashed) ----------
CREATE TABLE public.customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kiosk_device_id uuid REFERENCES public.kiosk_devices(id) ON DELETE SET NULL,
  session_token_hash text NOT NULL UNIQUE, -- sha256(raw token)
  status public.session_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  completed_at timestamptz
);
CREATE INDEX idx_cs_store_status ON public.customer_sessions(store_id, status);
CREATE INDEX idx_cs_expires ON public.customer_sessions(expires_at) WHERE status = 'active';
-- NO anon or authenticated grant beyond staff RLS. Kiosk mutations happen
-- via service-role server functions that re-hash the raw token.
GRANT SELECT ON public.customer_sessions TO authenticated;
GRANT ALL ON public.customer_sessions TO service_role;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_staff_read_store" ON public.customer_sessions
  FOR SELECT TO authenticated
  USING (public.has_store_membership(auth.uid(), store_id));

-- ---------- session_symptoms ----------
CREATE TABLE public.session_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.customer_sessions(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.symptoms(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, symptom_id)
);
CREATE INDEX idx_ss_session ON public.session_symptoms(session_id);
GRANT SELECT ON public.session_symptoms TO authenticated;
GRANT ALL ON public.session_symptoms TO service_role;
ALTER TABLE public.session_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_staff_read_store" ON public.session_symptoms
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_sessions cs
    WHERE cs.id = session_id
      AND public.has_store_membership(auth.uid(), cs.store_id)
  ));

-- ---------- session_shortlist ----------
CREATE TABLE public.session_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.customer_sessions(id) ON DELETE CASCADE,
  store_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  action_type public.shortlist_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sl_session ON public.session_shortlist(session_id);
GRANT SELECT ON public.session_shortlist TO authenticated;
GRANT ALL ON public.session_shortlist TO service_role;
ALTER TABLE public.session_shortlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_staff_read_store" ON public.session_shortlist
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_sessions cs
    WHERE cs.id = session_id
      AND public.has_store_membership(auth.uid(), cs.store_id)
  ));

-- ---------- handovers ----------
CREATE TABLE public.handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.customer_sessions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  handover_code_display text NOT NULL, -- short display code, e.g. "HF-4Q2K"; unique within store while active
  handover_code_hash text NOT NULL UNIQUE, -- sha256 of the raw code (used for staff lookup)
  status public.handover_status NOT NULL DEFAULT 'waiting',
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  opened_by uuid, -- auth user id
  opened_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX idx_ho_store_status ON public.handovers(store_id, status);
CREATE INDEX idx_ho_expires ON public.handovers(expires_at) WHERE status IN ('waiting', 'opened');
CREATE UNIQUE INDEX uq_ho_store_active_code
  ON public.handovers(store_id, handover_code_display)
  WHERE status IN ('waiting', 'opened');
GRANT SELECT, UPDATE ON public.handovers TO authenticated;
GRANT ALL ON public.handovers TO service_role;
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ho_staff_read_store" ON public.handovers
  FOR SELECT TO authenticated
  USING (public.has_store_membership(auth.uid(), store_id));
-- Updates (open/complete) done via service-role server function which
-- re-verifies role + store scope. No direct policy grants writes.

-- ---------- handover_lookup_attempts (rate limiting + audit) ----------
CREATE TABLE public.handover_lookup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  actor_user_id uuid,
  actor_ip inet,
  submitted_code_hash text NOT NULL,
  succeeded boolean NOT NULL,
  reason text, -- 'not_found', 'expired', 'wrong_store', 'ok', 'rate_limited'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hla_actor_time ON public.handover_lookup_attempts(actor_user_id, created_at DESC);
CREATE INDEX idx_hla_store_time ON public.handover_lookup_attempts(store_id, created_at DESC);
GRANT SELECT ON public.handover_lookup_attempts TO authenticated;
GRANT ALL ON public.handover_lookup_attempts TO service_role;
ALTER TABLE public.handover_lookup_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hla_read_store_managers" ON public.handover_lookup_attempts
  FOR SELECT TO authenticated
  USING (
    store_id IS NULL AND public.is_platform_admin(auth.uid())
    OR (store_id IS NOT NULL AND (
      public.has_store_role(auth.uid(), store_id, 'store_manager')
      OR public.is_platform_admin(auth.uid())
    ))
  );

-- ---------- audit_events ----------
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  actor_user_id uuid,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ae_org_time ON public.audit_events(organisation_id, created_at DESC);
CREATE INDEX idx_ae_store_time ON public.audit_events(store_id, created_at DESC) WHERE store_id IS NOT NULL;
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae_read_org_members" ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.has_org_membership(auth.uid(), organisation_id));
