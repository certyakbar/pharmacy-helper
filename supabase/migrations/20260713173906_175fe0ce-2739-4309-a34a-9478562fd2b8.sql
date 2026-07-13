
-- =========================================================================
-- Finder read RPCs
--
-- Contract:
--   * These are the ONLY customer-facing catalogue read paths.
--   * They resolve the active publication for a store
--     (catalogue_publications with superseded_at IS NULL) and read from the
--     immutable catalogue_version_items snapshot for that version.
--   * If no such publication exists, or the underlying version is not
--     frozen, they return {"status":"unavailable", ...}. They never fall
--     back to draft data or to other stores' catalogues.
--   * SECURITY DEFINER, granted to anon + authenticated so the anonymous
--     kiosk client and signed-in staff both call the same code path.
-- =========================================================================

-- ---- 1. Bootstrap -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finder_bootstrap(_store uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _symptoms jsonb;
  _groups jsonb;
BEGIN
  SELECT * INTO _store_row FROM public.stores WHERE id = _store AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','store_not_found');
  END IF;

  SELECT * INTO _pub FROM public.catalogue_publications
   WHERE store_id = _store AND superseded_at IS NULL
   LIMIT 1;

  IF FOUND THEN
    SELECT * INTO _cv FROM public.catalogue_versions
     WHERE id = _pub.catalogue_version_id
       AND organisation_id = _store_row.organisation_id
       AND frozen_at IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.catalogue_version_items
                     WHERE catalogue_version_id = _pub.catalogue_version_id
                       AND store_id = _store);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'code', s.code,
           'name', s.name,
           'customer_description', s.customer_description,
           'icon', s.icon,
           'display_order', s.display_order
         ) ORDER BY s.display_order, s.name), '[]'::jsonb)
    INTO _symptoms
    FROM public.symptoms s WHERE s.active;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', g.id,
           'code', g.code,
           'name', g.name,
           'customer_description', g.customer_description,
           'icon', g.icon,
           'display_order', g.display_order
         ) ORDER BY g.display_order, g.name), '[]'::jsonb)
    INTO _groups
    FROM public.customer_display_groups g WHERE g.active;

  RETURN jsonb_build_object(
    'status', CASE WHEN _cv.id IS NULL THEN 'unavailable' ELSE 'ok' END,
    'generated_at', now(),
    'store', jsonb_build_object('id', _store_row.id, 'name', _store_row.name),
    'symptoms', _symptoms,
    'display_groups', _groups,
    'catalogue_version',
      CASE WHEN _cv.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', _cv.id,
        'version_number', _cv.version_number,
        'label', _cv.label,
        'frozen_at', _cv.frozen_at,
        'published_at', _pub.published_at,
        'publication_id', _pub.id
      ) END,
    'unavailable_reason',
      CASE WHEN _cv.id IS NULL THEN
        CASE WHEN _pub.id IS NULL THEN 'no_active_publication'
             ELSE 'catalogue_version_incomplete' END
      ELSE NULL END);
END;
$$;

-- ---- 2. Catalogue snapshot for matching --------------------------------
CREATE OR REPLACE FUNCTION public.finder_catalogue_snapshot(_store uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _items jsonb;
  _pdgm jsonb;
  _sdgm jsonb;
BEGIN
  SELECT * INTO _store_row FROM public.stores WHERE id = _store AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','store_not_found');
  END IF;

  SELECT * INTO _pub FROM public.catalogue_publications
   WHERE store_id = _store AND superseded_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','no_active_publication');
  END IF;

  SELECT * INTO _cv FROM public.catalogue_versions
   WHERE id = _pub.catalogue_version_id
     AND organisation_id = _store_row.organisation_id
     AND frozen_at IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','catalogue_version_not_frozen');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', cvi.id,
           'product_id', cvi.product_id,
           'retailer_sku', cvi.retailer_sku,
           'product_name', cvi.product_name,
           'brand_name', cvi.brand_name,
           'active_ingredient', cvi.active_ingredient,
           'strength', cvi.strength,
           'formulation', cvi.formulation,
           'pack_size', cvi.pack_size,
           'customer_summary', cvi.customer_summary,
           'warning_text', cvi.warning_text,
           'image_url', cvi.image_url,
           'drowsiness_level', cvi.drowsiness_level,
           'requires_staff_help', cvi.requires_staff_help,
           'treatment_group_code', cvi.treatment_group_code,
           'treatment_group_name', cvi.treatment_group_name,
           'display_group_codes', cvi.display_group_codes,
           'price', cvi.price,
           'promotional_price', cvi.promotional_price,
           'currency', cvi.currency,
           'stock_quantity', cvi.stock_quantity,
           'stock_status', cvi.stock_status,
           'aisle', cvi.aisle,
           'bay', cvi.bay,
           'shelf', cvi.shelf,
           'available_for_display', cvi.available_for_display
         )), '[]'::jsonb)
    INTO _items
    FROM public.catalogue_version_items cvi
   WHERE cvi.catalogue_version_id = _cv.id
     AND cvi.store_id = _store
     AND cvi.available_for_display;

  -- Approved product-to-group edges for the products in this snapshot only.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'product_id', m.product_id,
           'display_group_id', m.display_group_id
         )), '[]'::jsonb)
    INTO _pdgm
    FROM public.product_display_group_mappings m
   WHERE m.active
     AND m.product_id IN (
       SELECT product_id FROM public.catalogue_version_items
        WHERE catalogue_version_id = _cv.id AND store_id = _store);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'symptom_id', m.symptom_id,
           'display_group_id', m.display_group_id,
           'relevance_weight', m.relevance_weight
         )), '[]'::jsonb)
    INTO _sdgm
    FROM public.symptom_display_group_mappings m
   WHERE m.active;

  RETURN jsonb_build_object(
    'status','ok',
    'generated_at', now(),
    'store', jsonb_build_object('id', _store_row.id, 'name', _store_row.name),
    'catalogue_version', jsonb_build_object(
      'id', _cv.id,
      'version_number', _cv.version_number,
      'label', _cv.label,
      'frozen_at', _cv.frozen_at,
      'published_at', _pub.published_at,
      'publication_id', _pub.id),
    'items', _items,
    'product_display_group_mappings', _pdgm,
    'symptom_display_group_mappings', _sdgm);
END;
$$;

-- ---- 3. Single product detail ------------------------------------------
CREATE OR REPLACE FUNCTION public.finder_product_detail(_store uuid, _item uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _item public.catalogue_version_items%ROWTYPE;
BEGIN
  SELECT * INTO _store_row FROM public.stores WHERE id = _store AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','store_not_found');
  END IF;

  SELECT * INTO _pub FROM public.catalogue_publications
   WHERE store_id = _store AND superseded_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','no_active_publication');
  END IF;

  SELECT * INTO _cv FROM public.catalogue_versions
   WHERE id = _pub.catalogue_version_id
     AND organisation_id = _store_row.organisation_id
     AND frozen_at IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','catalogue_version_not_frozen');
  END IF;

  SELECT * INTO _item FROM public.catalogue_version_items
   WHERE id = _item
     AND catalogue_version_id = _cv.id
     AND store_id = _store
     AND available_for_display;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'generated_at', now(),
    'catalogue_version', jsonb_build_object(
      'id', _cv.id,
      'version_number', _cv.version_number,
      'frozen_at', _cv.frozen_at,
      'published_at', _pub.published_at,
      'publication_id', _pub.id),
    'item', to_jsonb(_item));
END;
$$;

-- ---- Grants ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.finder_bootstrap(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finder_catalogue_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finder_product_detail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finder_bootstrap(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finder_catalogue_snapshot(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finder_product_detail(uuid, uuid) TO anon, authenticated;
