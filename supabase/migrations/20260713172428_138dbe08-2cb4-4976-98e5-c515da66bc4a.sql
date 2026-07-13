
-- =========================================================================
-- Stage 1g hotfix
-- =========================================================================

-- 1. Safe non-null audit fingerprints -------------------------------------
CREATE OR REPLACE FUNCTION app_private.handover_attempt_sentinel(_reason text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'sentinel:' || _reason
$$;
REVOKE EXECUTE ON FUNCTION app_private.handover_attempt_sentinel(text) FROM PUBLIC, anon, authenticated;

-- 2. Hash-accepting handover RPC ------------------------------------------
DROP FUNCTION IF EXISTS public.staff_open_handover(uuid, text);

CREATE OR REPLACE FUNCTION public.staff_open_handover_by_hash(_store uuid, _code_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _hash text;
  _row public.handovers%ROWTYPE;
  _sess public.customer_sessions%ROWTYPE;
  _recent int;
  _reason text;
  _newly_opened boolean := false;
  _symptoms jsonb;
  _shortlist jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','not_authorised');
  END IF;

  IF NOT app_private.has_store_membership(_store) THEN
    INSERT INTO public.handover_lookup_attempts(
      store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid,
        app_private.handover_attempt_sentinel('not_authorised'),
        false, 'not_authorised');
    RETURN jsonb_build_object('status','not_authorised');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(_uid::text || ':' || _store::text, 42));

  SELECT count(*) INTO _recent FROM public.handover_lookup_attempts
    WHERE actor_user_id = _uid AND store_id = _store
      AND created_at > now() - interval '1 minute';
  IF _recent >= 10 THEN
    INSERT INTO public.handover_lookup_attempts(
      store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid,
        app_private.handover_attempt_sentinel('rate_limited'),
        false, 'rate_limited');
    RETURN jsonb_build_object('status','rate_limited','retry_after_seconds',60);
  END IF;

  -- Validate the hash shape. Any deviation is audited as invalid_format
  -- with a sentinel fingerprint, never with the caller-supplied value.
  IF _code_hash IS NULL OR _code_hash !~ '^[0-9a-f]{64}$' THEN
    INSERT INTO public.handover_lookup_attempts(
      store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_store, _uid,
        app_private.handover_attempt_sentinel('invalid_format'),
        false, 'not_found');
    RETURN jsonb_build_object('status','not_found');
  END IF;
  _hash := _code_hash;

  SELECT * INTO _row FROM public.handovers
    WHERE handover_code_hash = _hash AND store_id = _store LIMIT 1;

  IF NOT FOUND THEN
    _reason := 'not_found';
  ELSIF _row.expires_at < now() THEN
    _reason := 'expired';
  ELSIF _row.status NOT IN ('waiting','opened') THEN
    _reason := 'not_active';
  ELSE
    _reason := 'ok';
  END IF;

  INSERT INTO public.handover_lookup_attempts(
    store_id, actor_user_id, submitted_code_hash, succeeded, reason)
    VALUES (_store, _uid, _hash, _reason = 'ok', _reason);

  IF _reason <> 'ok' THEN
    RETURN jsonb_build_object('status', _reason);
  END IF;

  -- Atomically open a waiting handover.
  UPDATE public.handovers
     SET status = 'opened',
         opened_by = _uid,
         opened_at = coalesce(opened_at, now())
   WHERE id = _row.id
     AND status = 'waiting'
     AND expires_at > now()
  RETURNING * INTO _row;

  IF FOUND THEN
    _newly_opened := true;
  ELSE
    SELECT * INTO _row FROM public.handovers WHERE id = _row.id;
    IF _row.expires_at < now() OR _row.status NOT IN ('waiting','opened') THEN
      RETURN jsonb_build_object('status','not_active');
    END IF;
  END IF;

  IF _newly_opened THEN
    INSERT INTO public.audit_events(
      organisation_id, store_id, actor_user_id,
      event_type, entity_type, entity_id, metadata)
    SELECT s.organisation_id, _row.store_id, _uid,
           'handover.opened', 'handover', _row.id,
           jsonb_build_object('session_id', _row.session_id)
      FROM public.stores s WHERE s.id = _row.store_id;
  END IF;

  SELECT * INTO _sess FROM public.customer_sessions WHERE id = _row.session_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'symptom_id', s.id,
           'code', s.code,
           'name', s.name
         ) ORDER BY s.name), '[]'::jsonb)
    INTO _symptoms
    FROM public.session_symptoms ss
    JOIN public.symptoms s ON s.id = ss.symptom_id
   WHERE ss.session_id = _row.session_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'store_product_id', sp.id,
           'action_type', sl.action_type,
           'product_name', p.product_name,
           'active_ingredient', p.active_ingredient,
           'formulation', p.formulation,
           'pack_size', p.pack_size,
           'price', sp.price,
           'stock_status', sp.stock_status,
           'aisle', sp.aisle,
           'bay', sp.bay,
           'shelf', sp.shelf,
           'requires_staff_help', p.requires_staff_help
         ) ORDER BY p.product_name), '[]'::jsonb)
    INTO _shortlist
    FROM public.session_shortlist sl
    JOIN public.store_products sp ON sp.id = sl.store_product_id
    JOIN public.products p ON p.id = sp.product_id
   WHERE sl.session_id = _row.session_id
     AND sp.store_id = _row.store_id;

  RETURN jsonb_build_object(
    'status','ok',
    'newly_opened', _newly_opened,
    'handover', jsonb_build_object(
      'handover_id', _row.id,
      'session_id', _row.session_id,
      'store_id', _row.store_id,
      'status', _row.status,
      'handover_code_masked', _row.handover_code_masked,
      'requested_at', _row.requested_at,
      'expires_at', _row.expires_at,
      'opened_by', _row.opened_by,
      'opened_at', _row.opened_at),
    'session', jsonb_build_object(
      'created_at', _sess.created_at,
      'last_activity_at', _sess.last_activity_at,
      'symptoms', _symptoms,
      'shortlist', _shortlist));
END;
$$;

REVOKE ALL ON FUNCTION public.staff_open_handover_by_hash(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_open_handover_by_hash(uuid, text) TO authenticated;

-- The pepper GUC path is no longer used; drop the DB-side helpers so
-- future callers cannot accidentally rely on the session GUC.
DROP FUNCTION IF EXISTS app_private.handover_hmac(text);
DROP FUNCTION IF EXISTS app_private.handover_pepper();

-- 3. Strict catalogue-import transition matrix ----------------------------
CREATE OR REPLACE FUNCTION app_private.enforce_catalogue_import_workflow()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _publisher boolean := app_private.is_publisher_context();
  _recovery  boolean := app_private.is_recovery_context();
  _is_admin  boolean := app_private.is_platform_admin();
  _is_appr   boolean := app_private.has_org_role(NEW.organisation_id, 'catalogue_approver');
  _is_edit   boolean := app_private.has_org_role(NEW.organisation_id, 'catalogue_editor');
  _from public.catalogue_import_status;
  _to   public.catalogue_import_status;
  _allowed boolean;
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

  _from := OLD.status;
  _to   := NEW.status;

  IF _from IN ('published','rejected') AND NOT (_recovery AND _is_admin) THEN
    RAISE EXCEPTION 'import is immutable in status %', _from USING ERRCODE = '42501';
  END IF;

  IF (NEW.catalogue_version_id IS DISTINCT FROM OLD.catalogue_version_id
      OR NEW.published_at IS DISTINCT FROM OLD.published_at)
     AND NOT (_publisher OR (_recovery AND _is_admin)) THEN
    RAISE EXCEPTION 'publication fields may only be changed by the internal publication function'
      USING ERRCODE = '42501';
  END IF;

  IF _from IS DISTINCT FROM _to THEN
    _allowed := false;
    IF (_from = 'uploaded'          AND _to = 'validating')
    OR (_from = 'validating'        AND _to = 'validation_failed')
    OR (_from = 'validation_failed' AND _to = 'validating')
    OR (_from = 'validating'        AND _to = 'ready_for_review') THEN
      IF NOT (_is_edit OR _is_admin OR _recovery) THEN
        RAISE EXCEPTION 'only catalogue editors may transition % -> %', _from, _to USING ERRCODE = '42501';
      END IF;
      _allowed := true;
    ELSIF _from = 'ready_for_review' AND _to IN ('approved','rejected') THEN
      IF NOT (_is_appr OR _is_admin OR _recovery) THEN
        RAISE EXCEPTION 'only catalogue approvers may % imports', _to USING ERRCODE = '42501';
      END IF;
      IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
        RAISE EXCEPTION 'approved_by / approved_at must be set when approving or rejecting' USING ERRCODE = '22004';
      END IF;
      IF NEW.approved_by IS DISTINCT FROM auth.uid() AND NOT (_publisher OR _recovery) THEN
        RAISE EXCEPTION 'approved_by must be the acting user' USING ERRCODE = '42501';
      END IF;
      _allowed := true;
    ELSIF _from = 'approved' AND _to = 'published' THEN
      IF NOT (_publisher OR (_recovery AND _is_admin)) THEN
        RAISE EXCEPTION 'only the internal publisher may move approved -> published' USING ERRCODE = '42501';
      END IF;
      _allowed := true;
    END IF;

    IF NOT _allowed AND NOT (_recovery AND _is_admin) THEN
      RAISE EXCEPTION 'catalogue import transition % -> % is not allowed', _from, _to USING ERRCODE = '42501';
    END IF;
  ELSE
    IF _from IN ('uploaded','validating','validation_failed','ready_for_review') THEN
      IF NOT (_is_edit OR _is_admin OR _publisher OR _recovery) THEN
        RAISE EXCEPTION 'not authorised to modify catalogue imports in status %', _from USING ERRCODE = '42501';
      END IF;
    ELSIF _from = 'approved' THEN
      IF NOT (_publisher OR (_recovery AND _is_admin)) THEN
        RAISE EXCEPTION 'approved imports may only be modified by the publisher' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF (NEW.approved_by IS DISTINCT FROM OLD.approved_by
        OR NEW.approved_at IS DISTINCT FROM OLD.approved_at)
       AND NOT (_publisher OR (_recovery AND _is_admin)) THEN
      RAISE EXCEPTION 'approval fields may only be set through an approver decision' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION app_private.enforce_catalogue_import_workflow() FROM PUBLIC, anon, authenticated;

-- 4. Wrapper is the write boundary for catalogue_imports ------------------
DROP POLICY IF EXISTS ci_editor_write ON public.catalogue_imports;

CREATE POLICY ci_editor_insert ON public.catalogue_imports
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_org_role(organisation_id, 'catalogue_editor')
    OR app_private.has_org_role(organisation_id, 'catalogue_approver')
    OR app_private.is_platform_admin()
  );

REVOKE UPDATE, DELETE ON public.catalogue_imports FROM authenticated;
-- SELECT via ci_read_org_members and INSERT via ci_editor_insert remain.
-- All state changes go through the SECURITY DEFINER wrappers
-- (catalogue_editor_update_import, catalogue_approver_decide_import,
-- publish_catalogue_version). service_role keeps ALL for admin recovery.
