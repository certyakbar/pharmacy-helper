
-- ============================================================
-- Stage 1e: Remediation migration (v2)
-- ============================================================

-- (9) Private helper schema
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = auth.uid() AND om.role = 'platform_admin'
      AND om.status = 'active' AND sp.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_staff_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.staff_profiles WHERE auth_user_id = auth.uid() AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.has_org_membership(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = auth.uid() AND om.organisation_id = _org
      AND om.status = 'active' AND sp.status = 'active'
  ) OR app_private.is_platform_admin();
$$;

CREATE OR REPLACE FUNCTION app_private.has_org_role(_org uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.organisation_memberships om ON om.staff_profile_id = sp.id
    WHERE sp.auth_user_id = auth.uid() AND om.organisation_id = _org
      AND om.role = _role AND om.status = 'active' AND sp.status = 'active'
  ) OR app_private.is_platform_admin();
$$;

CREATE OR REPLACE FUNCTION app_private.has_store_role(_store uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.store_memberships sm ON sm.staff_profile_id = sp.id
    WHERE sp.auth_user_id = auth.uid() AND sm.store_id = _store
      AND sm.role = _role AND sm.status = 'active' AND sp.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.stores st
    JOIN public.staff_profiles sp ON sp.auth_user_id = auth.uid()
    JOIN public.organisation_memberships om
      ON om.staff_profile_id = sp.id AND om.organisation_id = st.organisation_id
     AND om.role = _role AND om.status = 'active'
    WHERE st.id = _store AND sp.status = 'active'
  ) OR app_private.is_platform_admin();
$$;

CREATE OR REPLACE FUNCTION app_private.has_store_membership(_store uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.store_memberships sm ON sm.staff_profile_id = sp.id
    WHERE sp.auth_user_id = auth.uid() AND sm.store_id = _store
      AND sm.status = 'active' AND sp.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.stores st
    WHERE st.id = _store AND app_private.has_org_membership(st.organisation_id)
  ) OR app_private.is_platform_admin();
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.current_staff_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_org_membership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_org_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_store_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_store_membership(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "org_select_members" ON public.organisations;
DROP POLICY IF EXISTS "org_admin_all" ON public.organisations;
CREATE POLICY "org_select_members" ON public.organisations FOR SELECT TO authenticated
  USING (app_private.has_org_membership(id));
CREATE POLICY "org_admin_all" ON public.organisations FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "stores_select_members" ON public.stores;
DROP POLICY IF EXISTS "stores_write_managers" ON public.stores;
CREATE POLICY "stores_select_members" ON public.stores FOR SELECT TO authenticated
  USING (app_private.has_org_membership(organisation_id));
CREATE POLICY "stores_write_managers" ON public.stores FOR ALL TO authenticated
  USING (
    app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.has_store_role(id, 'store_manager')
    OR app_private.is_platform_admin()
  ) WITH CHECK (
    app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.has_store_role(id, 'store_manager')
    OR app_private.is_platform_admin()
  );

DROP POLICY IF EXISTS "staff_own_select" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_own_update" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_admin_all" ON public.staff_profiles;
CREATE POLICY "staff_own_select" ON public.staff_profiles FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR app_private.is_platform_admin());
CREATE POLICY "staff_own_update" ON public.staff_profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "staff_admin_all" ON public.staff_profiles FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

CREATE OR REPLACE FUNCTION app_private.tg_staff_profile_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_private.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'auth_user_id cannot be changed by the user';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status cannot be changed by the user';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_profile_self_guard ON public.staff_profiles;
CREATE TRIGGER trg_staff_profile_self_guard
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_staff_profile_self_update_guard();

DROP POLICY IF EXISTS "orgmem_own_select" ON public.organisation_memberships;
DROP POLICY IF EXISTS "orgmem_admin_all" ON public.organisation_memberships;
CREATE POLICY "orgmem_own_select" ON public.organisation_memberships FOR SELECT TO authenticated
  USING (staff_profile_id = app_private.current_staff_profile_id() OR app_private.is_platform_admin());
CREATE POLICY "orgmem_admin_all" ON public.organisation_memberships FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "storemem_own_select" ON public.store_memberships;
DROP POLICY IF EXISTS "storemem_admin_all" ON public.store_memberships;
CREATE POLICY "storemem_own_select" ON public.store_memberships FOR SELECT TO authenticated
  USING (
    staff_profile_id = app_private.current_staff_profile_id()
    OR app_private.has_store_role(store_id, 'store_manager')
    OR app_private.is_platform_admin()
  );
CREATE POLICY "storemem_admin_all" ON public.store_memberships FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "kiosk_read_store_members" ON public.kiosk_devices;
DROP POLICY IF EXISTS "kiosk_manage_store_managers" ON public.kiosk_devices;
CREATE POLICY "kiosk_read_store_members" ON public.kiosk_devices FOR SELECT TO authenticated
  USING (app_private.has_store_membership(store_id));
CREATE POLICY "kiosk_manage_store_managers" ON public.kiosk_devices FOR ALL TO authenticated
  USING (
    app_private.has_store_role(store_id, 'store_manager')
    OR app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.is_platform_admin()
  ) WITH CHECK (
    app_private.has_store_role(store_id, 'store_manager')
    OR app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.is_platform_admin()
  );

DROP POLICY IF EXISTS "symptoms_admin_write" ON public.symptoms;
CREATE POLICY "symptoms_admin_write" ON public.symptoms FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "cdg_admin_write" ON public.customer_display_groups;
CREATE POLICY "cdg_admin_write" ON public.customer_display_groups FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "treatment_admin_write" ON public.treatment_groups;
CREATE POLICY "treatment_admin_write" ON public.treatment_groups FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "sdgm_admin_write" ON public.symptom_display_group_mappings;
CREATE POLICY "sdgm_admin_write" ON public.symptom_display_group_mappings FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "products_editor_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "pdgm_editor_write" ON public.product_display_group_mappings;
CREATE POLICY "pdgm_admin_write" ON public.product_display_group_mappings FOR ALL TO authenticated
  USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

DROP POLICY IF EXISTS "sp_read_store_members" ON public.store_products;
DROP POLICY IF EXISTS "sp_manage_store" ON public.store_products;
CREATE POLICY "sp_read_store_members" ON public.store_products FOR SELECT TO authenticated
  USING (app_private.has_store_membership(store_id));
CREATE POLICY "sp_manage_store" ON public.store_products FOR ALL TO authenticated
  USING (
    app_private.has_store_role(store_id, 'store_manager')
    OR EXISTS (SELECT 1 FROM public.stores st WHERE st.id = store_id
               AND (app_private.has_org_role(st.organisation_id, 'catalogue_editor')
                    OR app_private.has_org_role(st.organisation_id, 'catalogue_approver')))
    OR app_private.is_platform_admin()
  ) WITH CHECK (
    app_private.has_store_role(store_id, 'store_manager')
    OR EXISTS (SELECT 1 FROM public.stores st WHERE st.id = store_id
               AND (app_private.has_org_role(st.organisation_id, 'catalogue_editor')
                    OR app_private.has_org_role(st.organisation_id, 'catalogue_approver')))
    OR app_private.is_platform_admin()
  );

DROP POLICY IF EXISTS "cv_read_org_members" ON public.catalogue_versions;
DROP POLICY IF EXISTS "cv_editor_insert_update_draft" ON public.catalogue_versions;
DROP POLICY IF EXISTS "cv_editor_update_draft" ON public.catalogue_versions;
CREATE POLICY "cv_read_org_members" ON public.catalogue_versions FOR SELECT TO authenticated
  USING (app_private.has_org_membership(organisation_id));
CREATE POLICY "cv_editor_insert_draft" ON public.catalogue_versions FOR INSERT TO authenticated
  WITH CHECK (
    status = 'draft'
    AND (app_private.has_org_role(organisation_id, 'catalogue_editor')
         OR app_private.has_org_role(organisation_id, 'catalogue_approver')
         OR app_private.is_platform_admin())
  );
CREATE POLICY "cv_editor_update_draft" ON public.catalogue_versions FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND (app_private.has_org_role(organisation_id, 'catalogue_editor')
         OR app_private.has_org_role(organisation_id, 'catalogue_approver')
         OR app_private.is_platform_admin())
  ) WITH CHECK (
    status = 'draft'
    AND (app_private.has_org_role(organisation_id, 'catalogue_editor')
         OR app_private.has_org_role(organisation_id, 'catalogue_approver')
         OR app_private.is_platform_admin())
  );

DROP POLICY IF EXISTS "cvi_read_org_members" ON public.catalogue_version_items;
DROP POLICY IF EXISTS "cvi_editor_write_draft" ON public.catalogue_version_items;
CREATE POLICY "cvi_read_org_members" ON public.catalogue_version_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogue_versions cv
                 WHERE cv.id = catalogue_version_id AND app_private.has_org_membership(cv.organisation_id)));
CREATE POLICY "cvi_editor_write_draft" ON public.catalogue_version_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogue_versions cv
                 WHERE cv.id = catalogue_version_id AND cv.status = 'draft'
                   AND (app_private.has_org_role(cv.organisation_id, 'catalogue_editor')
                        OR app_private.has_org_role(cv.organisation_id, 'catalogue_approver')
                        OR app_private.is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.catalogue_versions cv
                      WHERE cv.id = catalogue_version_id AND cv.status = 'draft'
                        AND (app_private.has_org_role(cv.organisation_id, 'catalogue_editor')
                             OR app_private.has_org_role(cv.organisation_id, 'catalogue_approver')
                             OR app_private.is_platform_admin())));

DROP POLICY IF EXISTS "cp_read_store_members" ON public.catalogue_publications;
DROP POLICY IF EXISTS "cp_approver_insert" ON public.catalogue_publications;
CREATE POLICY "cp_read_store_members" ON public.catalogue_publications FOR SELECT TO authenticated
  USING (app_private.has_store_membership(store_id));
REVOKE INSERT, UPDATE, DELETE ON public.catalogue_publications FROM authenticated;

DROP POLICY IF EXISTS "ci_read_org_members" ON public.catalogue_imports;
DROP POLICY IF EXISTS "ci_editor_write" ON public.catalogue_imports;
CREATE POLICY "ci_read_org_members" ON public.catalogue_imports FOR SELECT TO authenticated
  USING (app_private.has_org_membership(organisation_id));
CREATE POLICY "ci_editor_write" ON public.catalogue_imports FOR ALL TO authenticated
  USING (
    app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.is_platform_admin()
  ) WITH CHECK (
    app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.is_platform_admin()
  );

DROP POLICY IF EXISTS "cir_read_org_members" ON public.catalogue_import_rows;
DROP POLICY IF EXISTS "cir_editor_write" ON public.catalogue_import_rows;
CREATE POLICY "cir_read_org_members" ON public.catalogue_import_rows FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogue_imports ci
                 WHERE ci.id = catalogue_import_id AND app_private.has_org_membership(ci.organisation_id)));
CREATE POLICY "cir_editor_write" ON public.catalogue_import_rows FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.catalogue_imports ci
                 WHERE ci.id = catalogue_import_id
                   AND (app_private.has_org_role(ci.organisation_id, 'catalogue_editor')
                        OR app_private.has_org_role(ci.organisation_id, 'catalogue_approver')
                        OR app_private.is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.catalogue_imports ci
                      WHERE ci.id = catalogue_import_id
                        AND (app_private.has_org_role(ci.organisation_id, 'catalogue_editor')
                             OR app_private.has_org_role(ci.organisation_id, 'catalogue_approver')
                             OR app_private.is_platform_admin())));

DROP POLICY IF EXISTS "cs_staff_read_store" ON public.customer_sessions;
CREATE POLICY "cs_staff_read_store" ON public.customer_sessions FOR SELECT TO authenticated
  USING (app_private.has_store_membership(store_id));

DROP POLICY IF EXISTS "ss_staff_read_store" ON public.session_symptoms;
CREATE POLICY "ss_staff_read_store" ON public.session_symptoms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_sessions cs
                 WHERE cs.id = session_id AND app_private.has_store_membership(cs.store_id)));

DROP POLICY IF EXISTS "sl_staff_read_store" ON public.session_shortlist;
CREATE POLICY "sl_staff_read_store" ON public.session_shortlist FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_sessions cs
                 WHERE cs.id = session_id AND app_private.has_store_membership(cs.store_id)));

DROP POLICY IF EXISTS "hla_read_store_managers" ON public.handover_lookup_attempts;
CREATE POLICY "hla_read_store_managers" ON public.handover_lookup_attempts FOR SELECT TO authenticated
  USING (
    (store_id IS NULL AND app_private.is_platform_admin())
    OR (store_id IS NOT NULL AND (app_private.has_store_role(store_id, 'store_manager') OR app_private.is_platform_admin()))
  );

DROP POLICY IF EXISTS "ae_read_org_members" ON public.audit_events;
CREATE POLICY "ae_read_org_members" ON public.audit_events FOR SELECT TO authenticated
  USING (app_private.has_org_membership(organisation_id));

DROP POLICY IF EXISTS "ho_staff_read_store" ON public.handovers;

DROP FUNCTION IF EXISTS public.current_staff_profile_id();
DROP FUNCTION IF EXISTS public.is_platform_admin(uuid);
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_org_membership(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_store_role(uuid, uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_store_membership(uuid, uuid);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.handovers ADD COLUMN IF NOT EXISTS handover_code_masked text;

UPDATE public.handovers
   SET handover_code_masked = CASE
     WHEN length(handover_code_display) >= 4 THEN '••' || right(handover_code_display, 4)
     ELSE '••••'
   END
 WHERE handover_code_masked IS NULL;

DROP INDEX IF EXISTS public.uq_ho_store_active_code;
ALTER TABLE public.handovers DROP COLUMN IF EXISTS handover_code_display;

CREATE INDEX IF NOT EXISTS idx_ho_active_hash
  ON public.handovers(store_id, handover_code_hash)
  WHERE status IN ('waiting', 'opened');

REVOKE SELECT, UPDATE ON public.handovers FROM authenticated;

CREATE OR REPLACE FUNCTION public.staff_lookup_handover(_store uuid, _code text)
RETURNS TABLE (
  handover_id uuid, session_id uuid, status public.handover_status,
  handover_code_masked text, requested_at timestamptz, expires_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hash text; _row public.handovers%ROWTYPE; _reason text; _recent int;
BEGIN
  IF NOT app_private.has_store_membership(_store) THEN
    RAISE EXCEPTION 'not authorised for store' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO _recent FROM public.handover_lookup_attempts
   WHERE actor_user_id = auth.uid() AND store_id = _store
     AND created_at > now() - interval '1 minute';
  IF _recent >= 10 THEN
    INSERT INTO public.handover_lookup_attempts (store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, auth.uid(), encode(digest(coalesce(_code, ''), 'sha256'), 'hex'), false, 'rate_limited');
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = '42901';
  END IF;
  _hash := encode(digest(coalesce(_code, ''), 'sha256'), 'hex');
  SELECT * INTO _row FROM public.handovers WHERE handover_code_hash = _hash AND store_id = _store LIMIT 1;
  IF NOT FOUND THEN _reason := 'not_found';
  ELSIF _row.expires_at < now() THEN _reason := 'expired';
  ELSIF _row.status NOT IN ('waiting', 'opened') THEN _reason := 'not_active';
  ELSE _reason := 'ok'; END IF;
  INSERT INTO public.handover_lookup_attempts (store_id, actor_user_id, submitted_code_hash, succeeded, reason)
    VALUES (_store, auth.uid(), _hash, _reason = 'ok', _reason);
  IF _reason <> 'ok' THEN RETURN; END IF;
  RETURN QUERY SELECT _row.id, _row.session_id, _row.status,
                      _row.handover_code_masked, _row.requested_at, _row.expires_at;
END;
$$;
REVOKE ALL ON FUNCTION public.staff_lookup_handover(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_lookup_handover(uuid, text) TO authenticated;

ALTER TABLE public.catalogue_version_items
  ADD COLUMN IF NOT EXISTS product_name         text,
  ADD COLUMN IF NOT EXISTS brand_name           text,
  ADD COLUMN IF NOT EXISTS active_ingredient    text,
  ADD COLUMN IF NOT EXISTS strength             text,
  ADD COLUMN IF NOT EXISTS formulation          public.formulation_type,
  ADD COLUMN IF NOT EXISTS pack_size            text,
  ADD COLUMN IF NOT EXISTS customer_summary     text,
  ADD COLUMN IF NOT EXISTS warning_text         text,
  ADD COLUMN IF NOT EXISTS image_url            text,
  ADD COLUMN IF NOT EXISTS drowsiness_level     public.drowsiness_level,
  ADD COLUMN IF NOT EXISTS requires_staff_help  boolean,
  ADD COLUMN IF NOT EXISTS treatment_group_code text,
  ADD COLUMN IF NOT EXISTS treatment_group_name text,
  ADD COLUMN IF NOT EXISTS display_group_codes  text[];

UPDATE public.catalogue_version_items cvi
   SET product_name         = COALESCE(cvi.product_name, p.product_name),
       brand_name           = COALESCE(cvi.brand_name, p.brand_name),
       active_ingredient    = COALESCE(cvi.active_ingredient, p.active_ingredient),
       strength             = COALESCE(cvi.strength, p.strength),
       formulation          = COALESCE(cvi.formulation, p.formulation),
       pack_size            = COALESCE(cvi.pack_size, p.pack_size),
       customer_summary     = COALESCE(cvi.customer_summary, p.customer_summary),
       warning_text         = COALESCE(cvi.warning_text, p.warning_text),
       image_url            = COALESCE(cvi.image_url, p.image_url),
       drowsiness_level     = COALESCE(cvi.drowsiness_level, p.drowsiness_level),
       requires_staff_help  = COALESCE(cvi.requires_staff_help, p.requires_staff_help),
       treatment_group_code = COALESCE(cvi.treatment_group_code, tg.code),
       treatment_group_name = COALESCE(cvi.treatment_group_name, tg.name),
       display_group_codes  = COALESCE(cvi.display_group_codes, ARRAY(
         SELECT cdg.code FROM public.product_display_group_mappings pdgm
         JOIN public.customer_display_groups cdg ON cdg.id = pdgm.display_group_id
         WHERE pdgm.product_id = p.id AND pdgm.active
         ORDER BY cdg.display_order
       ))
  FROM public.products p
  LEFT JOIN public.treatment_groups tg ON tg.id = p.treatment_group_id
 WHERE cvi.product_id = p.id;

ALTER TABLE public.catalogue_version_items
  ALTER COLUMN product_name        SET NOT NULL,
  ALTER COLUMN active_ingredient   SET NOT NULL,
  ALTER COLUMN formulation         SET NOT NULL,
  ALTER COLUMN pack_size           SET NOT NULL,
  ALTER COLUMN drowsiness_level    SET NOT NULL,
  ALTER COLUMN requires_staff_help SET NOT NULL,
  ALTER COLUMN display_group_codes SET NOT NULL;

ALTER TABLE public.catalogue_version_items
  DROP CONSTRAINT IF EXISTS cvi_price_nonneg,
  ADD  CONSTRAINT cvi_price_nonneg CHECK (price >= 0),
  DROP CONSTRAINT IF EXISTS cvi_promo_nonneg,
  ADD  CONSTRAINT cvi_promo_nonneg CHECK (promotional_price IS NULL OR promotional_price >= 0),
  DROP CONSTRAINT IF EXISTS cvi_stock_nonneg,
  ADD  CONSTRAINT cvi_stock_nonneg CHECK (stock_quantity >= 0);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cvi_ver_store_sku
  ON public.catalogue_version_items(catalogue_version_id, store_id, retailer_sku);

DROP INDEX IF EXISTS public.uq_cp_active_per_store;
CREATE UNIQUE INDEX uq_cp_active_per_store
  ON public.catalogue_publications(store_id) WHERE superseded_at IS NULL;

CREATE OR REPLACE FUNCTION app_private.tg_cvi_org_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _ver_org uuid; _store_org uuid;
BEGIN
  SELECT organisation_id INTO _ver_org FROM public.catalogue_versions WHERE id = NEW.catalogue_version_id;
  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = NEW.store_id;
  IF _ver_org IS NULL OR _store_org IS NULL OR _ver_org <> _store_org THEN
    RAISE EXCEPTION 'catalogue_version_items: store % does not belong to version organisation %', NEW.store_id, _ver_org;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cvi_org_guard ON public.catalogue_version_items;
CREATE TRIGGER trg_cvi_org_guard
  BEFORE INSERT OR UPDATE ON public.catalogue_version_items
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_cvi_org_guard();

CREATE OR REPLACE FUNCTION app_private.tg_cp_org_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _ver_org uuid; _store_org uuid;
BEGIN
  SELECT organisation_id INTO _ver_org FROM public.catalogue_versions WHERE id = NEW.catalogue_version_id;
  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = NEW.store_id;
  IF _ver_org IS NULL OR _store_org IS NULL OR _ver_org <> _store_org THEN
    RAISE EXCEPTION 'catalogue_publications: store % does not belong to version organisation %', NEW.store_id, _ver_org;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cp_org_guard ON public.catalogue_publications;
CREATE TRIGGER trg_cp_org_guard
  BEFORE INSERT OR UPDATE ON public.catalogue_publications
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_cp_org_guard();

CREATE OR REPLACE FUNCTION app_private.is_publisher_context()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.catalogue_workflow', true), '') = 'publisher';
$$;

DROP TRIGGER IF EXISTS trg_cv_immutable ON public.catalogue_versions;
DROP FUNCTION IF EXISTS public.tg_catalogue_version_immutable();

CREATE OR REPLACE FUNCTION app_private.tg_cv_workflow_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND NOT app_private.is_publisher_context() THEN
      RAISE EXCEPTION 'frozen catalogue_versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'draft' AND NOT app_private.is_publisher_context() THEN
      RAISE EXCEPTION 'frozen catalogue_versions is immutable';
    END IF;
    IF OLD.status = 'draft' AND NOT app_private.is_publisher_context() THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.frozen_at IS DISTINCT FROM OLD.frozen_at THEN
        RAISE EXCEPTION 'approval/publication fields may only be set by internal workflow';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cv_workflow_guard ON public.catalogue_versions;
CREATE TRIGGER trg_cv_workflow_guard
  BEFORE UPDATE OR DELETE ON public.catalogue_versions
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_cv_workflow_guard();

CREATE OR REPLACE FUNCTION app_private.tg_cvi_workflow_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _status public.catalogue_version_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO _status FROM public.catalogue_versions WHERE id = OLD.catalogue_version_id;
    IF _status IS DISTINCT FROM 'draft' AND NOT app_private.is_publisher_context() THEN
      RAISE EXCEPTION 'frozen catalogue_version_items cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  SELECT status INTO _status FROM public.catalogue_versions WHERE id = NEW.catalogue_version_id;
  IF _status IS DISTINCT FROM 'draft' AND NOT app_private.is_publisher_context() THEN
    RAISE EXCEPTION 'frozen catalogue_version_items cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cvi_workflow_guard ON public.catalogue_version_items;
CREATE TRIGGER trg_cvi_workflow_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.catalogue_version_items
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_cvi_workflow_guard();

CREATE OR REPLACE FUNCTION app_private.approve_catalogue_version(_version uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.catalogue_versions WHERE id = _version AND status = 'draft';
  IF _org IS NULL THEN RAISE EXCEPTION 'draft catalogue version not found'; END IF;
  IF NOT (app_private.has_org_role(_org, 'catalogue_approver') OR app_private.is_platform_admin()) THEN
    RAISE EXCEPTION 'only catalogue approvers may approve' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.catalogue_workflow', 'publisher', true);
  UPDATE public.catalogue_versions
     SET status = 'approved', approved_by = auth.uid(), approved_at = now(), frozen_at = now()
   WHERE id = _version;
END;
$$;
REVOKE ALL ON FUNCTION app_private.approve_catalogue_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.approve_catalogue_version(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.publish_catalogue_version(_version uuid, _store uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _store_org uuid; _new_id uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.catalogue_versions WHERE id = _version AND status IN ('approved','superseded');
  IF _org IS NULL THEN RAISE EXCEPTION 'approved catalogue version required'; END IF;
  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = _store;
  IF _store_org IS DISTINCT FROM _org THEN RAISE EXCEPTION 'store does not belong to version organisation'; END IF;
  IF NOT (app_private.has_org_role(_org, 'catalogue_approver') OR app_private.is_platform_admin()) THEN
    RAISE EXCEPTION 'only catalogue approvers may publish' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.catalogue_workflow', 'publisher', true);
  UPDATE public.catalogue_publications SET superseded_at = now()
   WHERE store_id = _store AND superseded_at IS NULL;
  INSERT INTO public.catalogue_publications(store_id, catalogue_version_id, published_by, notes)
    VALUES (_store, _version, auth.uid(), _notes) RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$$;
REVOKE ALL ON FUNCTION app_private.publish_catalogue_version(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.publish_catalogue_version(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.rollback_catalogue_publication(_store uuid, _target_version uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _store_org uuid; _new_id uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.catalogue_versions WHERE id = _target_version;
  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = _store;
  IF _store_org IS DISTINCT FROM _org THEN RAISE EXCEPTION 'store does not belong to version organisation'; END IF;
  IF NOT (app_private.has_org_role(_org, 'catalogue_approver') OR app_private.is_platform_admin()) THEN
    RAISE EXCEPTION 'only catalogue approvers may roll back' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.catalogue_workflow', 'publisher', true);
  UPDATE public.catalogue_publications SET superseded_at = now()
   WHERE store_id = _store AND superseded_at IS NULL;
  INSERT INTO public.catalogue_publications(store_id, catalogue_version_id, published_by, is_rollback, notes)
    VALUES (_store, _target_version, auth.uid(), true, _notes) RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$$;
REVOKE ALL ON FUNCTION app_private.rollback_catalogue_publication(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.rollback_catalogue_publication(uuid, uuid, text) TO authenticated, service_role;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS postcode       text,
  ADD COLUMN IF NOT EXISTS country_code   char(2);

UPDATE public.stores
   SET address_line_1 = COALESCE(address_line_1, address),
       country_code   = COALESCE(country_code, 'GB')
 WHERE address IS NOT NULL OR country_code IS NULL;

UPDATE public.stores
   SET address_line_1 = '1 High Street',
       city           = 'Anywhere',
       postcode       = 'AN1 1AA',
       country_code   = 'GB'
 WHERE id = '00000000-0000-0000-0000-000000000101'
   AND (city IS NULL OR postcode IS NULL);

ALTER TABLE public.stores DROP COLUMN IF EXISTS address;

ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ae_dedupe_key
  ON public.audit_events(dedupe_key) WHERE dedupe_key IS NOT NULL;

DELETE FROM public.audit_events
 WHERE event_type = 'catalogue.published'
   AND entity_type = 'catalogue_publication'
   AND entity_id = '00000000-0000-0000-0000-000000000A01'
   AND dedupe_key IS NULL;

INSERT INTO public.audit_events (organisation_id, store_id, event_type, entity_type, entity_id, metadata, dedupe_key)
SELECT
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'catalogue.published',
  'catalogue_publication',
  '00000000-0000-0000-0000-000000000A01',
  jsonb_build_object('seed', true, 'version_number', 1),
  'seed:catalogue.published:v1'
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_events WHERE dedupe_key = 'seed:catalogue.published:v1'
);

DO $$
BEGIN
  PERFORM set_config('app.catalogue_workflow', 'publisher', true);
  UPDATE public.catalogue_versions
     SET frozen_at = COALESCE(frozen_at, now())
   WHERE status IN ('approved', 'superseded', 'rolled_back');
END $$;
