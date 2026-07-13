
-- Helper: direct pharmacy_staff / store_manager assignment, or platform_admin.
-- Deliberately excludes organisation-level roles: opening a handover requires
-- a store-scoped membership row (or platform admin).
CREATE OR REPLACE FUNCTION app_private.can_open_store_handover(_store uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_private.is_platform_admin()
      OR EXISTS (
        SELECT 1
          FROM public.staff_profiles sp
          JOIN public.store_memberships sm ON sm.staff_profile_id = sp.id
         WHERE sp.auth_user_id = auth.uid()
           AND sm.store_id = _store
           AND sm.role IN ('pharmacy_staff','store_manager')
           AND sm.status = 'active'
           AND sp.status = 'active'
      );
$$;

CREATE OR REPLACE FUNCTION public.staff_open_handover_by_hash(_store uuid, _code_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _store_exists boolean;
  _audit_store uuid;
  _hash text;
  _row public.handovers%ROWTYPE;
  _sess public.customer_sessions%ROWTYPE;
  _handover_id uuid;
  _recent int;
  _reason text;
  _newly_opened boolean := false;
  _symptoms jsonb;
  _shortlist jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','not_authorised');
  END IF;

  -- Resolve store existence up front so the audit insert never violates the
  -- store_id FK. We still return 'not_authorised' for both "unknown store"
  -- and "known store, no membership" to avoid leaking store existence.
  SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = _store) INTO _store_exists;
  _audit_store := CASE WHEN _store_exists THEN _store ELSE NULL END;

  IF (NOT _store_exists) OR (NOT app_private.can_open_store_handover(_store)) THEN
    INSERT INTO public.handover_lookup_attempts(
      store_id, actor_user_id, submitted_code_hash, succeeded, reason)
      VALUES (_audit_store, _uid,
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

  -- Preserve the handover id in a local variable BEFORE the conditional
  -- UPDATE ... RETURNING. If the UPDATE affects no rows (already opened by
  -- another staff member, expired between SELECT and UPDATE, etc.) the
  -- composite _row variable can be left in an implementation-defined state,
  -- so we must not rely on _row.id for the follow-up SELECT.
  _handover_id := _row.id;

  UPDATE public.handovers
     SET status = 'opened',
         opened_by = _uid,
         opened_at = coalesce(opened_at, now())
   WHERE id = _handover_id
     AND status = 'waiting'
     AND expires_at > now()
  RETURNING * INTO _row;

  IF FOUND THEN
    _newly_opened := true;
  ELSE
    SELECT * INTO _row FROM public.handovers WHERE id = _handover_id;
    IF NOT FOUND OR _row.expires_at < now()
       OR _row.status NOT IN ('waiting','opened') THEN
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
$function$;
