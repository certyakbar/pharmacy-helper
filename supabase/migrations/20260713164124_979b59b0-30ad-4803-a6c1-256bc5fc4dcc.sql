
-- =========================================================================
-- Stage 1f remediation
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Shared helpers: workflow context, handover pepper, code normalisation
-- -------------------------------------------------------------------------

-- Recovery context (platform admin only) used to bypass the immutability
-- trigger on published / rejected catalogue_imports rows.
CREATE OR REPLACE FUNCTION app_private.is_recovery_context()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.catalogue_recovery', true), '') = 'platform_admin'
$$;

REVOKE EXECUTE ON FUNCTION app_private.is_recovery_context() FROM PUBLIC, anon, authenticated;

-- HMAC pepper for handover codes. Must be set as a session/txn GUC by the
-- application server from the HANDOVER_CODE_PEPPER environment variable.
CREATE OR REPLACE FUNCTION app_private.handover_pepper()
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE _p text := current_setting('app.settings.handover_pepper', true);
BEGIN
  IF _p IS NULL OR length(_p) < 16 THEN
    RAISE EXCEPTION 'handover pepper not configured' USING ERRCODE = '42501';
  END IF;
  RETURN _p;
END;
$$;
REVOKE EXECUTE ON FUNCTION app_private.handover_pepper() FROM PUBLIC, anon, authenticated;

-- Crockford Base32 normalisation shared by creation and lookup.
-- 8 characters, alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ (no I,L,O,U).
CREATE OR REPLACE FUNCTION app_private.normalise_handover_code(_raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE _c text;
BEGIN
  IF _raw IS NULL THEN RAISE EXCEPTION 'handover code required' USING ERRCODE = '22023'; END IF;
  _c := upper(regexp_replace(btrim(_raw), '[-\s]', '', 'g'));
  IF length(_c) <> 8 THEN
    RAISE EXCEPTION 'handover code must be 8 characters' USING ERRCODE = '22023';
  END IF;
  IF _c !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$' THEN
    RAISE EXCEPTION 'handover code contains invalid characters' USING ERRCODE = '22023';
  END IF;
  RETURN _c;
END;
$$;
REVOKE EXECUTE ON FUNCTION app_private.normalise_handover_code(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.handover_hmac(_raw text)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE _n text; _p text;
BEGIN
  _n := app_private.normalise_handover_code(_raw);
  _p := app_private.handover_pepper();
  RETURN encode(extensions.hmac(_n::bytea, _p::bytea, 'sha256'), 'hex');
END;
$$;
REVOKE EXECUTE ON FUNCTION app_private.handover_hmac(text) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. Catalogue import workflow guard
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_private.enforce_catalogue_import_workflow()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _publisher boolean := app_private.is_publisher_context();
  _recovery  boolean := app_private.is_recovery_context();
  _is_admin  boolean := app_private.is_platform_admin();
  _is_appr   boolean := app_private.has_org_role(NEW.organisation_id, 'catalogue_approver');
  _is_edit   boolean := app_private.has_org_role(NEW.organisation_id, 'catalogue_editor');
  _editable_states catalogue_import_status[]
    := ARRAY['uploaded','validating','validation_failed','ready_for_review']::catalogue_import_status[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'uploaded' AND NOT (_publisher OR _recovery OR _is_admin) THEN
      RAISE EXCEPTION 'new imports must start in status uploaded' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL
       OR NEW.published_at IS NOT NULL OR NEW.catalogue_version_id IS NOT NULL THEN
      IF NOT (_publisher OR _recovery OR _is_admin) THEN
        RAISE EXCEPTION 'approval / publication fields cannot be set on insert' USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: immutability of published / rejected rows
  IF OLD.status IN ('published','rejected') AND NOT (_recovery AND _is_admin) THEN
    RAISE EXCEPTION 'import is immutable in status %', OLD.status USING ERRCODE = '42501';
  END IF;

  -- Publication-owned columns
  IF (NEW.catalogue_version_id IS DISTINCT FROM OLD.catalogue_version_id
      OR NEW.published_at IS DISTINCT FROM OLD.published_at
      OR (NEW.status = 'published' AND OLD.status <> 'published'))
     AND NOT (_publisher OR (_recovery AND _is_admin)) THEN
    RAISE EXCEPTION 'publication fields may only be changed by the internal publication function'
      USING ERRCODE = '42501';
  END IF;

  -- Approval / rejection
  IF (NEW.status IN ('approved','rejected')) AND OLD.status <> NEW.status THEN
    IF NOT (_is_appr OR _is_admin OR _publisher OR _recovery) THEN
      RAISE EXCEPTION 'only catalogue approvers or platform admins may % imports', NEW.status
        USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_by IS DISTINCT FROM auth.uid() AND NOT (_publisher OR _recovery) THEN
      RAISE EXCEPTION 'approved_by must be the acting user' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'approved_at must be set when approving / rejecting' USING ERRCODE = '22004';
    END IF;
  ELSIF (NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at)
        AND NOT (_publisher OR (_recovery AND _is_admin)) THEN
    RAISE EXCEPTION 'approval fields may only be set through an approver decision' USING ERRCODE = '42501';
  END IF;

  -- Editor edits only in editable states, and only if the status is not
  -- becoming approved / rejected / published in this update.
  IF NOT (_publisher OR _recovery OR _is_admin OR _is_appr) THEN
    IF NOT _is_edit THEN
      RAISE EXCEPTION 'not authorised to modify catalogue imports' USING ERRCODE = '42501';
    END IF;
    IF NOT (OLD.status = ANY(_editable_states)) THEN
      RAISE EXCEPTION 'editors cannot modify imports in status %', OLD.status USING ERRCODE = '42501';
    END IF;
    IF NEW.status = ANY(ARRAY['approved','rejected','published']::catalogue_import_status[]) THEN
      RAISE EXCEPTION 'editors cannot move imports into status %', NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION app_private.enforce_catalogue_import_workflow() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_catalogue_import_workflow ON public.catalogue_imports;
CREATE TRIGGER trg_catalogue_import_workflow
BEFORE INSERT OR UPDATE ON public.catalogue_imports
FOR EACH ROW EXECUTE FUNCTION app_private.enforce_catalogue_import_workflow();

-- -------------------------------------------------------------------------
-- 3. Rollback + publish validation
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_private.publish_catalogue_version(_version uuid, _store uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _store_org uuid; _status catalogue_version_status; _frozen timestamptz; _items int; _new_id uuid;
BEGIN
  SELECT organisation_id, status, frozen_at INTO _org, _status, _frozen
    FROM public.catalogue_versions WHERE id = _version;
  IF _org IS NULL THEN RAISE EXCEPTION 'catalogue version not found' USING ERRCODE = '22023'; END IF;
  IF _status NOT IN ('approved','superseded') THEN
    RAISE EXCEPTION 'catalogue version must be approved or superseded (got %)', _status USING ERRCODE = '22023';
  END IF;
  IF _frozen IS NULL THEN RAISE EXCEPTION 'catalogue version is not frozen' USING ERRCODE = '22023'; END IF;

  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = _store;
  IF _store_org IS NULL OR _store_org IS DISTINCT FROM _org THEN
    RAISE EXCEPTION 'store does not belong to version organisation' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO _items FROM public.catalogue_version_items
    WHERE catalogue_version_id = _version AND store_id = _store;
  IF _items = 0 THEN
    RAISE EXCEPTION 'catalogue version contains no items for target store' USING ERRCODE = '22023';
  END IF;

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

CREATE OR REPLACE FUNCTION app_private.rollback_catalogue_publication(_store uuid, _target_version uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _store_org uuid; _status catalogue_version_status; _frozen timestamptz; _items int; _new_id uuid;
BEGIN
  SELECT organisation_id, status, frozen_at INTO _org, _status, _frozen
    FROM public.catalogue_versions WHERE id = _target_version;
  IF _org IS NULL THEN RAISE EXCEPTION 'catalogue version not found' USING ERRCODE = '22023'; END IF;
  IF _status NOT IN ('approved','superseded','rolled_back') THEN
    RAISE EXCEPTION 'rollback target must be approved, superseded or rolled_back (got %)', _status
      USING ERRCODE = '22023';
  END IF;
  IF _frozen IS NULL THEN
    RAISE EXCEPTION 'rollback target is not frozen' USING ERRCODE = '22023';
  END IF;

  SELECT organisation_id INTO _store_org FROM public.stores WHERE id = _store;
  IF _store_org IS NULL OR _store_org IS DISTINCT FROM _org THEN
    RAISE EXCEPTION 'store does not belong to version organisation' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO _items FROM public.catalogue_version_items
    WHERE catalogue_version_id = _target_version AND store_id = _store;
  IF _items = 0 THEN
    RAISE EXCEPTION 'rollback target contains no items for target store' USING ERRCODE = '22023';
  END IF;

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

REVOKE EXECUTE ON FUNCTION app_private.publish_catalogue_version(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.rollback_catalogue_publication(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. Customer session privacy — remove broad staff SELECT
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS cs_staff_read_store ON public.customer_sessions;
DROP POLICY IF EXISTS ss_staff_read_store ON public.session_symptoms;
DROP POLICY IF EXISTS sl_staff_read_store ON public.session_shortlist;

-- Retain narrow audit access for store managers and platform admins.
CREATE POLICY cs_audit_read ON public.customer_sessions
  FOR SELECT TO authenticated
  USING (app_private.has_store_role(store_id, 'store_manager') OR app_private.is_platform_admin());

CREATE POLICY ss_audit_read ON public.session_symptoms
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_sessions cs
                  WHERE cs.id = session_symptoms.session_id
                    AND (app_private.has_store_role(cs.store_id, 'store_manager')
                         OR app_private.is_platform_admin())));

CREATE POLICY sl_audit_read ON public.session_shortlist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_sessions cs
                  WHERE cs.id = session_shortlist.session_id
                    AND (app_private.has_store_role(cs.store_id, 'store_manager')
                         OR app_private.is_platform_admin())));

-- -------------------------------------------------------------------------
-- 5. Handover lookup — HMAC, structured status, advisory lock, session context
-- -------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.staff_lookup_handover(uuid, text);

CREATE OR REPLACE FUNCTION public.staff_open_handover(_store uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hash text; _row public.handovers%ROWTYPE; _reason text;
  _recent int; _norm text; _uid uuid := auth.uid();
  _sess public.customer_sessions%ROWTYPE;
  _symptoms jsonb; _shortlist jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','not_authorised');
  END IF;
  IF NOT app_private.has_store_membership(_store) THEN
    INSERT INTO public.handover_lookup_attempts(store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid, NULL, false, 'not_authorised');
    RETURN jsonb_build_object('status','not_authorised');
  END IF;

  -- Concurrency-safe rate limit: advisory lock per (user, store).
  PERFORM pg_advisory_xact_lock(
    hashtextextended(_uid::text || ':' || _store::text, 42));

  SELECT count(*) INTO _recent FROM public.handover_lookup_attempts
    WHERE actor_user_id = _uid AND store_id = _store
      AND created_at > now() - interval '1 minute';
  IF _recent >= 10 THEN
    INSERT INTO public.handover_lookup_attempts(store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid, NULL, false, 'rate_limited');
    RETURN jsonb_build_object('status','rate_limited','retry_after_seconds', 60);
  END IF;

  BEGIN
    _norm := app_private.normalise_handover_code(_code);
    _hash := app_private.handover_hmac(_norm);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.handover_lookup_attempts(store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid, NULL, false, 'not_found');
    RETURN jsonb_build_object('status','not_found');
  END;

  SELECT * INTO _row FROM public.handovers WHERE handover_code_hash = _hash AND store_id = _store LIMIT 1;

  IF NOT FOUND THEN _reason := 'not_found';
  ELSIF _row.expires_at < now() THEN _reason := 'expired';
  ELSIF _row.status NOT IN ('waiting','opened') THEN _reason := 'not_active';
  ELSE _reason := 'ok'; END IF;

  INSERT INTO public.handover_lookup_attempts(store_id, actor_user_id, submitted_code_hash, succeeded, reason)
    VALUES (_store, _uid, _hash, _reason = 'ok', _reason);

  IF _reason <> 'ok' THEN
    RETURN jsonb_build_object('status', _reason);
  END IF;

  SELECT * INTO _sess FROM public.customer_sessions WHERE id = _row.session_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'symptom_id', ss.symptom_id, 'severity', ss.severity)), '[]'::jsonb)
    INTO _symptoms
    FROM public.session_symptoms ss WHERE ss.session_id = _row.session_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'store_product_id', sl.store_product_id, 'action_type', sl.action_type)), '[]'::jsonb)
    INTO _shortlist
    FROM public.session_shortlist sl WHERE sl.session_id = _row.session_id;

  RETURN jsonb_build_object(
    'status','ok',
    'handover', jsonb_build_object(
      'handover_id', _row.id,
      'session_id', _row.session_id,
      'store_id', _row.store_id,
      'status', _row.status,
      'handover_code_masked', _row.handover_code_masked,
      'requested_at', _row.requested_at,
      'expires_at', _row.expires_at),
    'session', jsonb_build_object(
      'created_at', _sess.created_at,
      'last_activity_at', _sess.last_activity_at,
      'symptoms', _symptoms,
      'shortlist', _shortlist));
END;
$$;

REVOKE ALL ON FUNCTION public.staff_open_handover(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_open_handover(uuid, text) TO authenticated;

-- -------------------------------------------------------------------------
-- 6. Tenant consistency guards (apply even to service_role writes)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_private.enforce_kiosk_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _org uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.stores WHERE id = NEW.store_id;
  IF _org IS NULL OR _org IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'kiosk organisation_id must match store organisation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION app_private.enforce_catalogue_import_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _org uuid;
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    SELECT organisation_id INTO _org FROM public.stores WHERE id = NEW.store_id;
    IF _org IS NULL OR _org IS DISTINCT FROM NEW.organisation_id THEN
      RAISE EXCEPTION 'catalogue import organisation_id must match store organisation' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION app_private.enforce_customer_session_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _org uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.stores WHERE id = NEW.store_id;
  IF _org IS NULL OR _org IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'customer session organisation_id must match store organisation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION app_private.enforce_audit_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _org uuid;
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    SELECT organisation_id INTO _org FROM public.stores WHERE id = NEW.store_id;
    IF _org IS NULL OR _org IS DISTINCT FROM NEW.organisation_id THEN
      RAISE EXCEPTION 'audit event organisation_id must match store organisation' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION app_private.enforce_handover_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _sess_store uuid;
BEGIN
  SELECT store_id INTO _sess_store FROM public.customer_sessions WHERE id = NEW.session_id;
  IF _sess_store IS NULL OR _sess_store IS DISTINCT FROM NEW.store_id THEN
    RAISE EXCEPTION 'handover store_id must match session store_id' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION app_private.enforce_shortlist_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _sess_store uuid; _prod_store uuid;
BEGIN
  SELECT store_id INTO _sess_store FROM public.customer_sessions WHERE id = NEW.session_id;
  SELECT store_id INTO _prod_store FROM public.store_products WHERE id = NEW.store_product_id;
  IF _sess_store IS NULL OR _prod_store IS NULL OR _sess_store IS DISTINCT FROM _prod_store THEN
    RAISE EXCEPTION 'shortlist store_product must belong to same store as session' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION app_private.enforce_kiosk_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_catalogue_import_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_customer_session_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_audit_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_handover_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_shortlist_tenant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_kiosk_tenant ON public.kiosk_devices;
CREATE TRIGGER trg_kiosk_tenant BEFORE INSERT OR UPDATE ON public.kiosk_devices
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_kiosk_tenant();

DROP TRIGGER IF EXISTS trg_ci_tenant ON public.catalogue_imports;
CREATE TRIGGER trg_ci_tenant BEFORE INSERT OR UPDATE ON public.catalogue_imports
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_catalogue_import_tenant();

DROP TRIGGER IF EXISTS trg_cs_tenant ON public.customer_sessions;
CREATE TRIGGER trg_cs_tenant BEFORE INSERT OR UPDATE ON public.customer_sessions
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_customer_session_tenant();

DROP TRIGGER IF EXISTS trg_audit_tenant ON public.audit_events;
CREATE TRIGGER trg_audit_tenant BEFORE INSERT OR UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_audit_tenant();

DROP TRIGGER IF EXISTS trg_handover_tenant ON public.handovers;
CREATE TRIGGER trg_handover_tenant BEFORE INSERT OR UPDATE ON public.handovers
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_handover_tenant();

DROP TRIGGER IF EXISTS trg_shortlist_tenant ON public.session_shortlist;
CREATE TRIGGER trg_shortlist_tenant BEFORE INSERT OR UPDATE ON public.session_shortlist
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_shortlist_tenant();

-- -------------------------------------------------------------------------
-- 7. Public workflow wrapper RPCs (callable boundary for Stage 2)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalogue_editor_update_import(
  _import uuid, _status catalogue_import_status, _error_summary text DEFAULT NULL,
  _total_rows int DEFAULT NULL, _valid_rows int DEFAULT NULL, _invalid_rows int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organisation_id INTO _org FROM public.catalogue_imports WHERE id = _import;
  IF _org IS NULL THEN RAISE EXCEPTION 'import not found' USING ERRCODE = '22023'; END IF;
  IF NOT (app_private.has_org_role(_org, 'catalogue_editor') OR app_private.is_platform_admin()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _status IN ('approved','rejected','published') THEN
    RAISE EXCEPTION 'editors cannot transition to %', _status USING ERRCODE = '42501';
  END IF;
  UPDATE public.catalogue_imports
     SET status = _status,
         error_summary = coalesce(_error_summary, error_summary),
         total_rows = coalesce(_total_rows, total_rows),
         valid_rows = coalesce(_valid_rows, valid_rows),
         invalid_rows = coalesce(_invalid_rows, invalid_rows),
         updated_at = now()
   WHERE id = _import;
END; $$;

CREATE OR REPLACE FUNCTION public.catalogue_approver_decide_import(
  _import uuid, _decision text, _error_summary text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _new catalogue_import_status;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected' USING ERRCODE = '22023';
  END IF;
  _new := _decision::catalogue_import_status;
  SELECT organisation_id INTO _org FROM public.catalogue_imports WHERE id = _import;
  IF _org IS NULL THEN RAISE EXCEPTION 'import not found' USING ERRCODE = '22023'; END IF;
  IF NOT (app_private.has_org_role(_org, 'catalogue_approver') OR app_private.is_platform_admin()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.catalogue_imports
     SET status = _new,
         approved_by = auth.uid(),
         approved_at = now(),
         error_summary = coalesce(_error_summary, error_summary),
         updated_at = now()
   WHERE id = _import;
END; $$;

CREATE OR REPLACE FUNCTION public.publish_catalogue_version(_version uuid, _store uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN app_private.publish_catalogue_version(_version, _store, _notes);
END; $$;

CREATE OR REPLACE FUNCTION public.rollback_catalogue_publication(_store uuid, _target_version uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN app_private.rollback_catalogue_publication(_store, _target_version, _notes);
END; $$;

REVOKE ALL ON FUNCTION public.catalogue_editor_update_import(uuid, catalogue_import_status, text, int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalogue_editor_update_import(uuid, catalogue_import_status, text, int, int, int) TO authenticated;
REVOKE ALL ON FUNCTION public.catalogue_approver_decide_import(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalogue_approver_decide_import(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.publish_catalogue_version(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_catalogue_version(uuid, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.rollback_catalogue_publication(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_catalogue_publication(uuid, uuid, text) TO authenticated;

-- Ensure app_private schema stays internal (not reachable via PostgREST).
REVOKE USAGE ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
