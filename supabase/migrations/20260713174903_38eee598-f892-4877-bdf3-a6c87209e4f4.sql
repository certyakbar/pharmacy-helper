-- Stage 2A.1 correction patch

-- 1. finder_product_detail: include catalogue_version.label
CREATE OR REPLACE FUNCTION public.finder_product_detail(_store uuid, _item uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _item_row public.catalogue_version_items%ROWTYPE;
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

  SELECT * INTO _item_row FROM public.catalogue_version_items cvi
   WHERE cvi.id = _item
     AND cvi.catalogue_version_id = _cv.id
     AND cvi.store_id = _store
     AND cvi.available_for_display;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'generated_at', now(),
    'catalogue_version', jsonb_build_object(
      'id', _cv.id,
      'version_number', _cv.version_number,
      'label', _cv.label,
      'frozen_at', _cv.frozen_at,
      'published_at', _pub.published_at,
      'publication_id', _pub.id),
    'item', to_jsonb(_item_row));
END;
$function$;

-- 3. Remove product_display_group_mappings from customer snapshot (immutable
--    display grouping now derives from catalogue_version_items.display_group_codes).
CREATE OR REPLACE FUNCTION public.finder_catalogue_snapshot(_store uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _items jsonb;
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
    'symptom_display_group_mappings', _sdgm);
END;
$function$;

-- 2. Enforce trusted server-side boundary: only service_role can execute the
--    finder RPCs. Browser / anon / authenticated callers must go through the
--    TanStack server functions which resolve KIOSK_STORE_ID server-side.
REVOKE EXECUTE ON FUNCTION public.finder_bootstrap(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finder_catalogue_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finder_product_detail(uuid,uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finder_bootstrap(uuid)           TO service_role;
GRANT EXECUTE ON FUNCTION public.finder_catalogue_snapshot(uuid)  TO service_role;
GRANT EXECUTE ON FUNCTION public.finder_product_detail(uuid,uuid) TO service_role;
